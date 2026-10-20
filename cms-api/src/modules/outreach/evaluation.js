"use strict";
const { Op } = require("sequelize");
const sequelize = require("../../config/db");
const { Member, User, Notification } = require("../../models");
const { QrAttendanceSession } = require("../qr-attendance/models");
const { getSessionWithParent } = require("../qr-attendance/sessions.service");
const { getConfiguration } = require("./configuration");
const { key, DAY, findAbsenceEpisode, getOutcome, reminderWindow, reminderIsDue, hasSmsConsent, renderMessage } = require("./policy");
const {
  OutreachPreference, OutreachSessionPolicy, AttendanceFollowUp, OutreachDelivery,
  audienceIds, eligibleAssignees, audit,
} = require("./repository");

// Include an unfrozen registration roster so an unfinished recent gathering
// blocks an absence streak instead of accidentally joining two older absences.
const historyForMembers = async (memberIds, now = new Date(), transaction) => {
  if (!memberIds.length) return [];
  const rows = await sequelize.query(
    "SELECT eligible.member_id, s.id AS session_id, s.title, s.starts_at, s.status, s.expected_roster_frozen_at, " +
    "s.finalized_at, s.finalized_revision, s.activity_revision, p.series_key, ex.status AS exception_status, " +
    "CASE WHEN s.service_id IS NOT NULL THEN EXISTS(SELECT 1 FROM attendances a WHERE a.service_id=s.service_id AND a.member_id=eligible.member_id AND a.check_in_method<>'pre-reg' AND a.voided_at IS NULL) " +
    "ELSE EXISTS(SELECT 1 FROM event_attendances a WHERE a.session_id=s.id AND a.member_id=eligible.member_id AND a.voided_at IS NULL) END AS present " +
    "FROM (SELECT session_id, member_id FROM attendance_expected_members UNION " +
    "SELECT s2.id AS session_id, er.member_id FROM attendance_sessions s2 JOIN event_registrations er ON er.event_id=s2.event_id " +
    "WHERE s2.expected_roster_frozen_at IS NULL AND s2.expected_basis='registrations') eligible " +
    "JOIN attendance_sessions s ON s.id=eligible.session_id " +
    "JOIN outreach_session_policies p ON p.session_id=s.id AND p.followups_enabled=1 " +
    "LEFT JOIN attendance_exceptions ex ON ex.session_id=s.id AND ex.member_id=eligible.member_id " +
    "WHERE eligible.member_id IN (:memberIds) AND s.status<>'cancelled' AND s.starts_at<=:now " +
    "ORDER BY eligible.member_id, p.series_key, s.starts_at, s.id",
    { replacements: { memberIds, now }, type: sequelize.QueryTypes.SELECT, transaction },
  );
  return rows.map((row) => ({ ...row, member_id: Number(row.member_id), session_id: Number(row.session_id),
    outcome: getOutcome({ session: row, present: Boolean(Number(row.present)), exception: row.exception_status }) }));
};
const notifyAssignee = async (followup, member, transaction) => {
  if (!followup.assigned_to) return;
  const user = await User.findOne({ where: { id: followup.assigned_to, is_active: 1, is_deleted: 0 }, attributes: ["id"], transaction });
  if (user) await Notification.create({ user_id: user.id, type: "attendance_followup_assigned",
    message: "A care follow-up for " + member.first_name + " " + member.last_name + " is assigned to you.",
    reference_type: "follow_up", reference_id: followup.id, is_read: 0 }, { transaction });
};
const queueMessage = async ({ member, preference, session, followup, days, config, now, transaction }) => {
  const kind = followup ? "absence_followup" : "activity_reminder";
  if (preference && !(followup ? preference.attendance_followups : preference.activity_reminders)) return;
  const baseKey = followup ? "followup:" + followup.id : "reminder:" + session.id + ":" + days;
  const window = followup ? { due: new Date(followup.createdAt || followup.created_at || now), expires: new Date(new Date(followup.createdAt || followup.created_at || now).getTime() + 7 * DAY) }
    : reminderWindow(session, days, config.reminder_hour);
  if (now >= window.expires) return;
  const message = renderMessage(followup ? config.followup_template : config.reminder_template, member, session);
  const common = { member_id: member.id, session_id: session.id, follow_up_id: followup?.id || null, kind, reminder_days: days ?? null,
    message, scheduled_at: window.due, expires_at: window.expires, next_attempt_at: now, status: "queued" };
  const users = await User.findAll({ where: { member_id: member.id, is_active: 1, is_deleted: 0 }, attributes: ["id"], transaction });
  for (const user of users) {
    await OutreachDelivery.findOrCreate({ where: { idempotency_key: key(baseKey, member.id, "in_app", user.id) },
      defaults: { ...common, channel: "in_app", user_id: user.id }, transaction });
  }
  if (hasSmsConsent(member, preference)) {
    await OutreachDelivery.findOrCreate({ where: { idempotency_key: key(baseKey, member.id, "sms") },
      defaults: { ...common, channel: "sms", recipient_phone: preference.consent_phone }, transaction });
  }
};
const evaluateMembers = async (memberIds, config, now = new Date()) => {
  const unique = [...new Set(memberIds.map(Number))];
  let created = 0, cancelled = 0, inspected = 0;
  const history = await historyForMembers(unique, now);
  const grouped = new Map();
  for (const row of history) {
    const name = row.member_id + "|" + row.series_key;
    if (!grouped.has(name)) grouped.set(name, []);
    grouped.get(name).push(row);
  }
  for (const memberId of unique) {
    await sequelize.transaction(async (transaction) => {
      // All evaluators serialize on the Member, including a finalization hook
      // racing the recovery scheduler. Episode and delivery keys remain unique.
      const member = await Member.findByPk(memberId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!member) return;
      const currentCases = await AttendanceFollowUp.findAll({ where: { member_id: member.id }, transaction, lock: transaction.LOCK.UPDATE });
      const series = new Set([...currentCases.map((row) => row.series_key), ...history.filter((row) => row.member_id === memberId).map((row) => row.series_key)]);
      const preference = await OutreachPreference.findOne({ where: { member_id: member.id }, transaction });
      for (const seriesKey of series) {
        inspected++;
        const timeline = grouped.get(memberId + "|" + seriesKey) || [];
        const episode = member.status === "Active" ? findAbsenceEpisode(member.id, seriesKey, timeline) : null;
        for (const existing of currentCases.filter((row) => row.series_key === seriesKey && ["open", "assigned"].includes(row.status))) {
          if (existing.episode_key === episode?.episode_key) continue;
          await existing.update({ status: "cancelled", cancel_reason: "Attendance or eligibility changed", revision: Number(existing.revision) + 1 }, { transaction });
          await OutreachDelivery.update({ status: "cancelled", last_error_code: "FOLLOW_UP_NO_LONGER_ELIGIBLE" }, { where: { follow_up_id: existing.id, status: "queued" }, transaction });
          await audit(null, "FOLLOW_UP_CANCELLED", "attendance_follow_ups", existing.id, { reason: "attendance_or_eligibility_changed" }, transaction);
          cancelled++;
        }
        if (!episode) continue;
        let followup = currentCases.find((row) => row.episode_key === episode.episode_key);
        if (!followup) {
          const assignee = (await eligibleAssignees(member.id)).filter((candidate) => candidate.priority < 3).sort((a, b) => a.priority - b.priority || Number(a.id) - Number(b.id))[0];
          followup = await AttendanceFollowUp.create({ member_id: member.id, series_key: seriesKey, ...episode,
            assigned_to: assignee?.id || null, status: assignee ? "assigned" : "open" }, { transaction });
          await audit(null, "FOLLOW_UP_CREATED", "attendance_follow_ups", followup.id, { member_id: member.id, ...episode, series_key: seriesKey, assigned_to: followup.assigned_to }, transaction);
          await notifyAssignee(followup, member, transaction);
          created++;
        } else if (followup.status === "resolved") continue;
        else {
          const reopened = followup.status === "cancelled";
          const changed = Number(followup.absence_count) !== episode.absence_count || reopened;
          if (changed) await followup.update({ absence_count: episode.absence_count, status: followup.assigned_to ? "assigned" : "open",
            cancel_reason: null, revision: Number(followup.revision) + 1 }, { transaction });
          if (reopened) {
            await audit(null, "FOLLOW_UP_REOPENED", "attendance_follow_ups", followup.id, { reason: "attendance_refinalized" }, transaction);
            // Only unsent work may resume. Simulated/sent/delivered/unknown
            // attempts are never replayed as a side effect of a correction.
            await OutreachDelivery.update({ status: "queued", next_attempt_at: now, last_error_code: null }, {
              where: { follow_up_id: followup.id, status: "cancelled", attempt_count: 0, last_error_code: "FOLLOW_UP_NO_LONGER_ELIGIBLE", expires_at: { [Op.gt]: now } }, transaction,
            });
          }
        }
        const session = await getSessionWithParent(episode.trigger_session_id, transaction);
        await queueMessage({ member, preference, session, followup, config, now, transaction });
      }
    });
  }
  return { created_cases: created, cancelled_cases: cancelled, inspected_series: inspected };
};
const queueDueReminders = async (config, now) => {
  const policies = await OutreachSessionPolicy.findAll({ where: { reminders_enabled: true }, include: [{
    model: QrAttendanceSession, as: "session", required: true,
    where: { status: ["draft", "open"], starts_at: { [Op.gt]: now, [Op.lt]: new Date(now.getTime() + 32 * DAY) } },
  }] });
  let dueSessions = 0;
  for (const policy of policies) {
    const session = await getSessionWithParent(policy.session_id);
    if (["cancelled", "completed"].includes(String(session.target.status).toLowerCase())) continue;
    for (const days of config.reminder_days) {
      if (!reminderIsDue(policy, session, days, config, now)) continue;
      dueSessions++;
      const memberIds = await audienceIds(session);
      for (const memberId of memberIds) await sequelize.transaction(async (transaction) => {
        const member = await Member.findByPk(memberId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!member || member.status !== "Active") return;
        const preference = await OutreachPreference.findOne({ where: { member_id: member.id }, transaction });
        await queueMessage({ member, preference, session, days, config, now, transaction });
      });
    }
  }
  return dueSessions;
};
const evaluatePage = async ({ cursor = 0, memberIds, now = new Date() } = {}) => {
  const config = await getConfiguration();
  if (!config.enabled) return { enabled: false, next_cursor: null, created_cases: 0, cancelled_cases: 0 };
  let ids, nextCursor = null;
  if (memberIds) ids = [...new Set(memberIds.map(Number))].slice(0, 200);
  else {
    const rows = await Member.findAll({ where: { id: { [Op.gt]: cursor } }, attributes: ["id"], order: [["id", "ASC"]], limit: 201, raw: true });
    ids = rows.slice(0, 200).map((row) => Number(row.id));
    if (rows.length > 200) nextCursor = ids[ids.length - 1];
  }
  const due = !memberIds && !Number(cursor) ? await queueDueReminders(config, now) : 0;
  const results = await evaluateMembers(ids, config, now);
  return { enabled: true, next_cursor: nextCursor, evaluated_members: ids.length, due_reminder_windows: due, ...results };
};
module.exports = { historyForMembers, notifyAssignee, queueMessage, evaluateMembers, queueDueReminders, evaluatePage };
