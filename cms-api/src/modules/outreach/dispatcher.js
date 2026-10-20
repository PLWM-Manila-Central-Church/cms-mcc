"use strict";

const { Op } = require("sequelize");
const { randomUUID } = require("node:crypto");
const sequelize = require("../../config/db");
const { Member, User, Notification, SystemSetting } = require("../../models");
const { getSessionWithParent } = require("../qr-attendance/sessions.service");
const AppError = require("../../helpers/AppError");
const { getConfiguration, transportState } = require("./configuration");
const { normalizePhone, hasSmsConsent, findAbsenceEpisode, reminderIsDue, renderMessage, estimateSegments } = require("./policy");
const { historyForMembers } = require("./evaluation");
const { OutreachPreference, OutreachSessionPolicy, AttendanceFollowUp, OutreachDelivery, OutreachDeliveryAttempt, audienceIds, audit } = require("./repository");

const allowedRecipient = (phone) => process.env.SMS_ALLOW_ALL_OPTED_IN === "true"
  || (process.env.SMS_ALLOWED_RECIPIENTS || "").split(",").map(normalizePhone).filter(Boolean).includes(phone);
const preflight = async (job, config, now = new Date(), transaction) => {
  if (!config.enabled) return { hold: true, reason: "WORKFLOW_DISABLED" };
  if (now >= new Date(job.expires_at)) return { reason: "MESSAGE_EXPIRED" };
  const member = await Member.findByPk(job.member_id, { transaction, ...(transaction && { lock: transaction.LOCK.UPDATE }) });
  if (!member || member.status !== "Active") return { reason: "MEMBER_INACTIVE" };
  const preference = await OutreachPreference.findOne({ where: { member_id: member.id }, transaction });
  if (preference && !(job.kind === "activity_reminder" ? preference.activity_reminders : preference.attendance_followups)) return { reason: "PREFERENCE_DISABLED" };
  let session;
  try { session = await getSessionWithParent(job.session_id, transaction); } catch (error) {
    if (error.status === 404) return { reason: "ACTIVITY_UNAVAILABLE" };
    throw error;
  }
  if (String(session.target.status).toLowerCase() === "cancelled" || session.status === "cancelled") return { reason: "ACTIVITY_CANCELLED" };
  if (job.kind === "absence_followup") {
    const followup = await AttendanceFollowUp.findByPk(job.follow_up_id, { transaction });
    if (!followup || !["open", "assigned"].includes(followup.status)) return { reason: "FOLLOW_UP_CLOSED" };
    const history = (await historyForMembers([member.id], now, transaction)).filter((row) => row.series_key === followup.series_key);
    const episode = findAbsenceEpisode(member.id, followup.series_key, history);
    if (!episode || episode.episode_key !== followup.episode_key) return { reason: "ATTENDANCE_CHANGED" };
  } else {
    const policy = await OutreachSessionPolicy.findOne({ where: { session_id: session.id }, transaction });
    if (!policy || !config.reminder_days.includes(Number(job.reminder_days))
      || !reminderIsDue(policy, session, Number(job.reminder_days), config, now)
      || !(await audienceIds(session, transaction)).includes(Number(member.id))) return { reason: "REMINDER_NO_LONGER_ELIGIBLE" };
  }
  if (job.channel === "in_app") {
    const user = await User.findOne({ where: { id: job.user_id, member_id: member.id, is_active: 1, is_deleted: 0 }, attributes: ["id"], transaction });
    if (!user) return { reason: "RECIPIENT_ACCOUNT_INACTIVE" };
  } else {
    if (!hasSmsConsent(member, preference) || normalizePhone(member.phone) !== job.recipient_phone) return { reason: "SMS_CONSENT_MISSING_OR_CHANGED" };
    if (config.mode === "disabled") return { hold: true, reason: "SMS_DISABLED" };
    if (config.mode === "live") {
      const state = transportState();
      if (!state.sms_delivery_enabled || !state.provider_configured || !state.recipient_restriction_configured) return { hold: true, reason: "LIVE_SMS_DISABLED" };
      if (!allowedRecipient(job.recipient_phone)) return { reason: "RECIPIENT_NOT_ALLOWED" };
    }
  }
  const message = renderMessage(job.kind === "activity_reminder" ? config.reminder_template : config.followup_template, member, session);
  if (job.channel === "sms" && config.mode === "live" && estimateSegments(message) > Math.max(1, Math.min(5, Number(process.env.SMS_MAX_SEGMENTS) || 1))) return { failed: true, reason: "SMS_SEGMENT_LIMIT" };
  return { eligible: true, member, session, message };
};
const claimNext = async (config, now) => sequelize.transaction(async (transaction) => {
  const state = transportState();
  const smsProcessable = config.mode === "simulation" || config.mode === "live" && state.sms_delivery_enabled && state.provider_configured && state.recipient_restriction_configured;
  const row = await OutreachDelivery.findOne({
    where: { status: "queued", scheduled_at: { [Op.lte]: now }, next_attempt_at: { [Op.lte]: now }, ...(!smsProcessable ? { channel: "in_app" } : {}) },
    order: [["next_attempt_at", "ASC"], ["id", "ASC"]], transaction, lock: transaction.LOCK.UPDATE,
  });
  if (!row) return null;
  return row.update({ status: "processing", claim_token: randomUUID(), lease_until: new Date(now.getTime() + 600000),
    delivery_mode: row.channel === "in_app" ? "in_app" : config.mode }, { transaction });
});
const recoverExpiredClaims = async (now) => {
  const rows = await OutreachDelivery.findAll({ where: { status: "processing", lease_until: { [Op.lt]: now } }, limit: 100 });
  for (const row of rows) await sequelize.transaction(async (transaction) => {
    const locked = await OutreachDelivery.findByPk(row.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (locked.status !== "processing" || new Date(locked.lease_until) >= now) return;
    const ambiguous = locked.delivery_mode === "live" && locked.channel === "sms";
    await locked.update({ status: ambiguous ? "unknown" : "queued", next_attempt_at: now, claim_token: null, lease_until: null,
      last_error_code: ambiguous ? "WORKER_INTERRUPTED_REVIEW_REQUIRED" : "WORKER_RECOVERED" }, { transaction });
    await OutreachDeliveryAttempt.update({ status: ambiguous ? "unknown" : "failed", finished_at: now, error_code: "WORKER_INTERRUPTED" },
      { where: { delivery_id: locked.id, status: "processing" }, transaction });
  });
};
const reserveBudget = async (config, now, transaction) => {
  const day = new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10);
  const name = "outreach_sms_budget_" + day;
  const [setting] = await SystemSetting.findOrCreate({ where: { key: name }, defaults: { value: "0" }, transaction });
  await setting.reload({ transaction, lock: transaction.LOCK.UPDATE });
  if (Number(setting.value) >= config.daily_sms_cap) return false;
  await setting.update({ value: String(Number(setting.value) + 1) }, { transaction });
  return true;
};
const processClaim = async (claim, config, now) => {
  let prepared;
  await sequelize.transaction(async (transaction) => {
    const job = await OutreachDelivery.findByPk(claim.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (job.status !== "processing" || job.claim_token !== claim.claim_token) return;
    const check = await preflight(job, config, now, transaction);
    if (!check.eligible) {
      await job.update({ status: check.hold ? "queued" : check.failed ? "failed" : "cancelled",
        next_attempt_at: new Date(now.getTime() + 60000), lease_until: null, claim_token: null, last_error_code: check.reason }, { transaction });
      return;
    }
    const mode = job.channel === "in_app" ? "in_app" : config.mode;
    if (mode === "live" && !await reserveBudget(config, now, transaction)) {
      await job.update({ status: "queued", next_attempt_at: new Date(new Date(new Date(now.getTime() + 8 * 3600000).toISOString().slice(0, 10) + "T00:00:00+08:00").getTime() + 86400000),
        lease_until: null, claim_token: null, last_error_code: "DAILY_SMS_CAP" }, { transaction });
      return;
    }
    const attemptNumber = Number(job.attempt_count) + 1;
    const attempt = await OutreachDeliveryAttempt.create({ delivery_id: job.id, attempt_number: attemptNumber, mode, status: "processing", started_at: now }, { transaction });
    await job.update({ attempt_count: attemptNumber, message: check.message, delivery_mode: mode, last_error_code: null }, { transaction });
    if (mode === "in_app") {
      const notification = await Notification.create({ user_id: job.user_id, type: job.kind, message: check.message, is_read: 0,
        reference_id: job.kind === "activity_reminder" ? check.session.service_id || check.session.event_id : null,
        reference_type: job.kind === "activity_reminder" ? check.session.service_id ? "service" : "event" : null }, { transaction });
      await job.update({ notification_id: notification.id, status: "sent", sent_at: now, lease_until: null, claim_token: null }, { transaction });
      await attempt.update({ status: "sent", finished_at: now }, { transaction });
    } else if (mode === "simulation") {
      await job.update({ status: "simulated", sent_at: null, delivered_at: null, lease_until: null, claim_token: null }, { transaction });
      await attempt.update({ status: "simulated", finished_at: now }, { transaction });
    } else prepared = { id: job.id, token: job.claim_token, phone: job.recipient_phone, message: check.message, attemptId: attempt.id, attemptNumber };
  });
  if (!prepared) return;
  // Live transport remains behind an independent environment gate, even if a
  // setting/queue is modified directly. No live calls are made in QA.
  let result, failure;
  try {
    const latestConfig = await getConfiguration();
    const current = await OutreachDelivery.findByPk(prepared.id);
    const currentCheck = await preflight(current, latestConfig, new Date());
    if (!currentCheck.eligible || latestConfig.mode !== "live") failure = { code: "ELIGIBILITY_CHANGED_BEFORE_SEND", ambiguous: false };
    else result = await require("./mocean.transport").send(prepared);
  } catch (error) {
    failure = { code: /^([A-Z0-9_]){1,80}$/.test(error.code || "") ? error.code : "PROVIDER_RESULT_UNKNOWN",
      ambiguous: error.ambiguous !== false, retryable: error.retryable === true };
  }
  await sequelize.transaction(async (transaction) => {
    const job = await OutreachDelivery.findByPk(prepared.id, { transaction, lock: transaction.LOCK.UPDATE });
    if (job.claim_token !== prepared.token) return;
    const retry = failure?.retryable && prepared.attemptNumber < 3 && new Date(job.expires_at) > new Date();
    const status = result ? "sent" : failure.ambiguous ? "unknown" : retry ? "queued" : "failed";
    await job.update({ status, provider_message_id: result?.provider_message_id || null, sent_at: result ? new Date() : null,
      last_error_code: failure?.code || null, lease_until: null, claim_token: null,
      next_attempt_at: retry ? new Date(Date.now() + 60000 * Math.pow(2, prepared.attemptNumber)) : job.next_attempt_at }, { transaction });
    await OutreachDeliveryAttempt.update({ status: result ? "sent" : failure.ambiguous ? "unknown" : "failed",
      error_code: failure?.code || null, provider_message_id: result?.provider_message_id || null, finished_at: new Date() },
    { where: { id: prepared.attemptId }, transaction });
  });
};
const reconcileProviderStatuses = async (config, now) => {
  const state = transportState();
  if (config.mode !== "live" || !state.sms_delivery_enabled || !state.provider_configured || !state.recipient_restriction_configured) return;
  const jobs = await OutreachDelivery.findAll({ where: { channel: "sms", delivery_mode: "live", status: "sent", provider_message_id: { [Op.ne]: null },
    [Op.or]: [{ provider_status_checked_at: null }, { provider_status_checked_at: { [Op.lt]: new Date(now.getTime() - 300000) } }] }, limit: 10 });
  for (const job of jobs) {
    if (!allowedRecipient(job.recipient_phone)) continue;
    try {
      const status = await require("./mocean.transport").queryStatus(job.provider_message_id);
      await job.update({ status, provider_status_checked_at: now, ...(status === "delivered" ? { delivered_at: now } : {}),
        last_error_code: status === "failed" ? "PROVIDER_DELIVERY_FAILED" : status === "unknown" ? "PROVIDER_STATUS_UNKNOWN" : null });
    } catch { await job.update({ provider_status_checked_at: now, last_error_code: "PROVIDER_STATUS_UNAVAILABLE" }); }
  }
};
const processQueue = async ({ limit = 25, now = new Date() } = {}) => {
  const config = await getConfiguration();
  if (!config.enabled) return { enabled: false, processed: 0 };
  await recoverExpiredClaims(now);
  let processed = 0;
  for (; processed < Math.min(100, limit); processed++) {
    const claim = await claimNext(config, now);
    if (!claim) break;
    await processClaim(claim, config, now);
  }
  await reconcileProviderStatuses(config, now);
  return { enabled: true, processed, mode: config.mode, live_sms_enabled: transportState().sms_delivery_enabled };
};
const retryDelivery = async (id, user) => sequelize.transaction(async (transaction) => {
  const job = await OutreachDelivery.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!job) throw AppError.notFound("DELIVERY_NOT_FOUND", "Delivery was not found");
  if (job.status !== "failed") throw AppError.conflict("DELIVERY_NOT_RETRYABLE", "Only a definitive failure can be retried. Unknown results need provider review.");
  const check = await preflight(job, await getConfiguration(), new Date(), transaction);
  if (!check.eligible && !check.hold) throw AppError.conflict("DELIVERY_NOT_ELIGIBLE", "This message is no longer eligible: " + check.reason);
  await job.update({ status: "queued", next_attempt_at: new Date(), lease_until: null, claim_token: null, provider_message_id: null, last_error_code: null }, { transaction });
  await audit(user, "OUTREACH_DELIVERY_RETRIED", "outreach_deliveries", job.id, { channel: job.channel }, transaction);
  return { id: job.id, status: "queued" };
});
module.exports = { preflight, claimNext, recoverExpiredClaims, processClaim, processQueue, retryDelivery, reconcileProviderStatuses };
