"use strict";

const { Op } = require("sequelize");
const sequelize = require("../../config/db");
const { Member, User, Role, UserLeaderAssignment, AuditLog, EventRegistration, ServiceResponse, MinistryMembership } = require("../../models");
const { QrAttendanceSession, AttendanceExpectedMember, QrServiceAttendance, EventAttendance } = require("../qr-attendance/models");
const { getSessionWithParent } = require("../qr-attendance/sessions.service");
const { getMemberScopeWhere, ensureMemberInScope, isScopedLeader, requireLeaderScope } = require("../../helpers/scopedLeader.helper");
const AppError = require("../../helpers/AppError");
const { normalizePhone, maskedPhone, hasSmsConsent, getOutcome, isFinalized } = require("./policy");
const { STAFF_ROLES, GLOBAL_ROLES } = require("./permissions");
const { OutreachPreference, OutreachSessionPolicy, AttendanceException, AttendanceFollowUp, OutreachDelivery, OutreachDeliveryAttempt } = require("./models");

const audit = (user, action, table, id, values, transaction) => AuditLog.create({
  user_id: user?.userId || null, action, target_table: table, target_id: id || null, new_values: values,
}, { transaction });
const pageOptions = ({ page = 1, limit = 25 } = {}) => ({
  page: Number(page), limit: Number(limit), offset: (Number(page) - 1) * Number(limit),
});
const requireStaff = (user) => {
  if (!STAFF_ROLES.includes(user.roleName)) throw AppError.forbidden("Only Admin and Registration manage reminder policies, consent and attendance exceptions");
};
const memberWhere = async (user, query = {}) => {
  const clauses = [await getMemberScopeWhere(user) || {}];
  if (query.search) clauses.push({ [Op.or]: ["first_name", "last_name"].map((field) => ({ [field]: { [Op.like]: "%" + query.search + "%" } })) });
  return { [Op.and]: clauses };
};
const memberInclude = async (user, query) => ({
  model: Member, as: "member", required: true, where: await memberWhere(user, query),
  attributes: ["id", "first_name", "last_name", "cell_group_id", "group_id", "status"],
});
const assertCaseAccess = async (id, user, { write = false, transaction } = {}) => {
  if (write && user.roleName === "Leader") requireLeaderScope(user);
  const row = await AttendanceFollowUp.findByPk(id, { ...(transaction && { transaction, lock: transaction.LOCK.UPDATE }) });
  if (!row) throw AppError.notFound("FOLLOW_UP_NOT_FOUND", "Follow-up was not found");
  await ensureMemberInScope(row.member_id, user, { transaction });
  return row;
};
const getPreference = async (memberId, user, { self = false } = {}) => {
  if (self || user.roleName === "Member") {
    if (Number(user.memberId) !== Number(memberId)) throw AppError.forbidden("You can manage only your own notification preferences");
  } else requireStaff(user);
  const member = await Member.findByPk(memberId);
  if (!member) throw AppError.notFound("MEMBER_NOT_FOUND", "Member was not found");
  const preference = await OutreachPreference.findOne({ where: { member_id: member.id } });
  return {
    member_id: member.id, member_name: member.first_name + " " + member.last_name, phone: member.phone || "",
    sms_enabled: Boolean(preference?.sms_enabled), sms_effective: hasSmsConsent(member, preference),
    activity_reminders: preference?.activity_reminders ?? true, attendance_followups: preference?.attendance_followups ?? true,
    consent_at: preference?.consent_at || null, opted_out_at: preference?.opted_out_at || null,
    needs_reconsent: Boolean(preference?.sms_enabled && normalizePhone(member.phone) !== preference.consent_phone),
  };
};
const setPreference = async (memberId, data, user, { self = false } = {}) => {
  const ownConsent = self || user.roleName === "Member";
  if (ownConsent) {
    if (Number(user.memberId) !== Number(memberId)) throw AppError.forbidden("You can manage only your own notification preferences");
  } else {
    requireStaff(user);
    if (!data.consent_note?.trim()) throw AppError.badRequest("CONSENT_NOTE_REQUIRED", "Record how the member gave or withdrew consent");
  }
  await sequelize.transaction(async (transaction) => {
    const member = await Member.findByPk(memberId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!member) throw AppError.notFound("MEMBER_NOT_FOUND", "Member was not found");
    const phone = data.phone === undefined ? normalizePhone(member.phone) : normalizePhone(data.phone);
    if (data.phone?.trim() && !phone) throw AppError.badRequest("INVALID_MOBILE", "Enter a Philippine mobile number such as 09XXXXXXXXX or +639XXXXXXXXX");
    const existing = await OutreachPreference.findOne({ where: { member_id: member.id }, transaction, lock: transaction.LOCK.UPDATE });
    const previousPhone = existing?.consent_phone;
    const requiresConsent = data.sms_enabled && (!hasSmsConsent(member, existing) || phone !== existing?.consent_phone);
    if (data.sms_enabled && !phone) throw AppError.badRequest("MOBILE_REQUIRED", "A valid mobile number is required for SMS consent");
    if (requiresConsent && data.consent_confirmed !== true) throw AppError.badRequest("CONSENT_REQUIRED", "Confirm permission to send reminders and follow-up messages to this number");
    if (data.phone !== undefined) await member.update({ phone: phone || null }, { transaction });
    const values = {
      sms_enabled: data.sms_enabled, activity_reminders: data.activity_reminders, attendance_followups: data.attendance_followups,
      ...(requiresConsent ? { consent_phone: phone, consent_at: new Date(), consent_source: ownConsent ? "member" : "staff_recorded" } : {}),
      opted_out_at: data.sms_enabled ? null : new Date(), recorded_by: user.userId,
      consent_note: ownConsent ? "Member updated own notification preferences" : data.consent_note.trim(),
    };
    if (existing) await existing.update(values, { transaction });
    else await OutreachPreference.create({ member_id: member.id, ...values }, { transaction });
    const cancellation = { member_id: member.id, channel: "sms", status: "queued" };
    if (!data.sms_enabled || phone !== previousPhone) {
      await OutreachDelivery.update({ status: "cancelled", last_error_code: "CONSENT_CHANGED" }, { where: cancellation, transaction });
    } else {
      const disabledKinds = [];
      if (!data.activity_reminders) disabledKinds.push("activity_reminder");
      if (!data.attendance_followups) disabledKinds.push("absence_followup");
      if (disabledKinds.length) await OutreachDelivery.update({ status: "cancelled", last_error_code: "PREFERENCE_DISABLED" }, { where: { member_id: member.id, status: "queued", kind: { [Op.in]: disabledKinds } }, transaction });
    }
    await audit(user, "OUTREACH_PREFERENCES_UPDATED", "outreach_preferences", member.id, { sms_enabled: data.sms_enabled, phone: maskedPhone(phone), activity_reminders: data.activity_reminders, attendance_followups: data.attendance_followups }, transaction);
  });
  return getPreference(memberId, user, { self });
};
const listMembers = async (query, user) => {
  requireStaff(user);
  const pagination = pageOptions(query);
  const result = await Member.findAndCountAll({ where: await memberWhere(user, query), attributes: ["id", "first_name", "last_name", "phone", "status"], order: [["last_name", "ASC"], ["id", "ASC"]], limit: pagination.limit, offset: pagination.offset });
  return { items: result.rows.map((row) => ({ ...row.toJSON(), phone: maskedPhone(row.phone) })), total: result.count, page: pagination.page, limit: pagination.limit };
};
const audienceIds = async (session, transaction) => {
  if (session.expected_basis === "none") return [];
  if (session.expected_roster_frozen_at || session.expected_basis === "explicit_roster") {
    return (await AttendanceExpectedMember.findAll({ where: { session_id: session.id }, attributes: ["member_id"], raw: true, transaction })).map((row) => Number(row.member_id));
  }
  const rows = session.event_id
    ? await EventRegistration.findAll({ where: { event_id: session.event_id }, attributes: ["member_id"], raw: true, transaction })
    : await ServiceResponse.findAll({ where: { service_id: session.service_id, attendance_status: "ATTENDING" }, attributes: ["member_id"], raw: true, transaction });
  return [...new Set(rows.map((row) => Number(row.member_id)))];
};
const presenceIds = async (session, transaction) => {
  const model = session.service_id ? QrServiceAttendance : EventAttendance;
  return new Set((await model.findAll({
    where: { ...(session.service_id ? { service_id: session.service_id, check_in_method: { [Op.ne]: "pre-reg" } } : { session_id: session.id }), voided_at: null },
    attributes: ["member_id"], raw: true, transaction,
  })).map((row) => Number(row.member_id)));
};
const listSessions = async (query, user) => {
  if (!GLOBAL_ROLES.includes(user.roleName)) throw AppError.forbidden("Session policies are managed by church staff");
  const pagination = pageOptions(query);
  const where = { expected_basis: { [Op.ne]: "none" } };
  if (query.search) where.title = { [Op.like]: "%" + query.search + "%" };
  const result = await QrAttendanceSession.findAndCountAll({ where, order: [["starts_at", "DESC"], ["id", "DESC"]], limit: pagination.limit, offset: pagination.offset });
  const ids = result.rows.map((row) => row.id);
  const policies = ids.length ? await OutreachSessionPolicy.findAll({ where: { session_id: { [Op.in]: ids } } }) : [];
  const byId = new Map(policies.map((row) => [Number(row.session_id), row.toJSON()]));
  return { items: result.rows.map((row) => ({ ...row.toJSON(), is_finalized: isFinalized(row), policy: byId.get(Number(row.id)) || null })), total: result.count, page: pagination.page, limit: pagination.limit };
};
const setSessionPolicy = async (sessionId, data, user) => {
  requireStaff(user);
  const result = await sequelize.transaction(async (transaction) => {
    const session = await QrAttendanceSession.findByPk(sessionId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!session) throw AppError.notFound("SESSION_NOT_FOUND", "Attendance session was not found");
    if (session.status === "cancelled" || session.expected_basis === "none") throw AppError.conflict("EXPECTED_ROSTER_REQUIRED", "Choose an active session with an expected roster");
    const existing = await OutreachSessionPolicy.findOne({ where: { session_id: session.id }, transaction, lock: transaction.LOCK.UPDATE });
    if (Number(data.expected_revision) !== Number(existing?.revision || 0)) throw AppError.conflict("POLICY_CHANGED", "This policy changed. Refresh before saving.");
    const values = {
      reminders_enabled: data.reminders_enabled, followups_enabled: data.followups_enabled, series_key: data.series_key,
      reminders_enabled_at: data.reminders_enabled ? existing?.reminders_enabled && existing.reminders_enabled_at ? existing.reminders_enabled_at : new Date() : null,
      updated_by: user.userId, revision: Number(existing?.revision || 0) + 1,
    };
    const row = existing ? await existing.update(values, { transaction }) : await OutreachSessionPolicy.create({ session_id: session.id, ...values }, { transaction });
    await audit(user, "OUTREACH_POLICY_UPDATED", "outreach_session_policies", row.id, values, transaction);
    if (!data.reminders_enabled) await OutreachDelivery.update({ status: "cancelled", last_error_code: "POLICY_DISABLED" }, { where: { session_id: session.id, kind: "activity_reminder", status: "queued" }, transaction });
    require("./hooks").afterSessionChange(session.id, transaction);
    return row;
  });
  return result;
};
const getRoster = async (sessionId, query, user) => {
  if (!GLOBAL_ROLES.includes(user.roleName)) throw AppError.forbidden("Only staff can inspect the full expected roster");
  const session = await getSessionWithParent(sessionId);
  const ids = await audienceIds(session);
  const pagination = pageOptions(query);
  const members = await Member.findAndCountAll({ where: { [Op.and]: [{ id: { [Op.in]: ids } }, await memberWhere(user, query)] }, attributes: ["id", "first_name", "last_name"], order: [["last_name", "ASC"], ["id", "ASC"]], limit: pagination.limit, offset: pagination.offset });
  const present = await presenceIds(session);
  const exceptions = await AttendanceException.findAll({ where: { session_id: session.id }, raw: true });
  const byId = new Map(exceptions.map((row) => [Number(row.member_id), row]));
  return { session, total: members.count, page: pagination.page, limit: pagination.limit, items: members.rows.map((member) => ({
    ...member.toJSON(), recorded_present: present.has(Number(member.id)), exception: byId.get(Number(member.id)) || null,
    outcome: getOutcome({ session, present: present.has(Number(member.id)), exception: byId.get(Number(member.id))?.status }),
  })) };
};
const setException = async (sessionId, memberId, data, user) => {
  requireStaff(user);
  await sequelize.transaction(async (transaction) => {
    const session = await QrAttendanceSession.findByPk(sessionId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!session || session.status === "cancelled") throw AppError.notFound("SESSION_NOT_FOUND", "An active attendance session was not found");
    if (!(await audienceIds(session, transaction)).includes(Number(memberId))) throw AppError.forbidden("This member is not on the session's expected roster");
    if ((await presenceIds(session, transaction)).has(Number(memberId)) && data.status !== "cleared") throw AppError.conflict("MEMBER_PRESENT", "Confirmed attendance is already recorded for this member");
    const row = await AttendanceException.findOne({ where: { session_id: session.id, member_id: memberId }, transaction, lock: transaction.LOCK.UPDATE });
    const values = { status: data.status, reason: data.reason.trim(), updated_by: user.userId };
    if (row) await row.update(values, { transaction });
    else await AttendanceException.create({ session_id: session.id, member_id: memberId, ...values }, { transaction });
    await audit(user, "ATTENDANCE_EXCEPTION_UPDATED", "attendance_sessions", session.id, { member_id: Number(memberId), ...values }, transaction);
    await require("../qr-attendance/reconciliation.service").invalidateSessionFinalization(session.id, { transaction, actorId: user.userId, reason: "attendance_exception_changed" });
  });
  return { session_id: Number(sessionId), member_id: Number(memberId), status: data.status, finalization_reopened: true };
};

const eligibleAssignees = async (memberId) => {
  const member = await Member.findByPk(memberId);
  if (!member) return [];
  const assignments = await UserLeaderAssignment.findAll({ where: { is_active: true, revoked_at: null, [Op.or]: [
    { scope_type: "cell_group", scope_id: member.cell_group_id || 0 }, { scope_type: "member_group", scope_id: member.group_id || 0 },
  ] }, raw: true });
  const assignedIds = assignments.map((row) => Number(row.user_id));
  const ministryIds = new Set((await MinistryMembership.findAll({ where: { member_id: member.id }, attributes: ["ministry_role_id"], raw: true })).map((row) => Number(row.ministry_role_id)));
  const users = await User.findAll({ where: { is_active: 1, is_deleted: 0 }, attributes: ["id", "email", "member_id", "leads_cell_group_id", "leads_group_id", "leads_ministry_id"],
    include: [{ model: Role, as: "role", attributes: ["role_name"] }], order: [["id", "ASC"]] });
  return users.filter((user) => GLOBAL_ROLES.includes(user.role.role_name)
    || user.role.role_name === "Leader" && assignedIds.includes(Number(user.id))
    || user.role.role_name === "Ministry Leader" && ministryIds.has(Number(user.leads_ministry_id))
    || user.role.role_name === "Cell Group Leader" && Number(user.leads_cell_group_id) === Number(member.cell_group_id) && member.cell_group_id
    || user.role.role_name === "Group Leader" && Number(user.leads_group_id) === Number(member.group_id) && member.group_id)
    .map((user) => ({ id: user.id, email: user.email, role: user.role.role_name,
      priority: user.role.role_name === "Cell Group Leader" || user.role.role_name === "Leader" && assignments.some((a) => Number(a.user_id) === Number(user.id) && a.scope_type === "cell_group") ? 1
        : ["Leader", "Group Leader"].includes(user.role.role_name) ? 2 : 3 }));
};
const listFollowUps = async (query, user) => {
  const pagination = pageOptions(query);
  const where = query.status ? { status: query.status } : {};
  const result = await AttendanceFollowUp.findAndCountAll({ where, include: [await memberInclude(user, query), { model: User, as: "assignee", attributes: ["id", "email"] }],
    order: [["created_at", "DESC"], ["id", "DESC"]], limit: pagination.limit, offset: pagination.offset });
  return { items: result.rows, total: result.count, page: pagination.page, limit: pagination.limit };
};
const updateFollowUp = async (id, data, user, action) => {
  return sequelize.transaction(async (transaction) => {
    const row = await assertCaseAccess(id, user, { write: true, transaction });
    if (Number(data.expected_revision) !== Number(row.revision)) throw AppError.conflict("FOLLOW_UP_CHANGED", "This follow-up changed. Refresh before saving.");
    if (!["open", "assigned"].includes(row.status)) throw AppError.conflict("FOLLOW_UP_CLOSED", "This follow-up is already resolved or cancelled");
    const values = { revision: Number(row.revision) + 1 };
    if (action === "assign") {
      if (!GLOBAL_ROLES.includes(user.roleName) && Number(data.assigned_to) !== Number(user.userId)) throw AppError.forbidden("A team leader may claim only their own follow-up work");
      if (!GLOBAL_ROLES.includes(user.roleName) && row.assigned_to && Number(row.assigned_to) !== Number(user.userId)) throw AppError.forbidden("This follow-up is already assigned to another worker. Church staff can reassign it.");
      const candidates = await eligibleAssignees(row.member_id);
      if (!candidates.some((candidate) => Number(candidate.id) === Number(data.assigned_to))) throw AppError.forbidden("Choose an active worker assigned to this member or a church-wide pastoral/registration worker");
      Object.assign(values, { assigned_to: data.assigned_to, assigned_by: user.userId, status: "assigned" });
    } else {
      if (!GLOBAL_ROLES.includes(user.roleName) && row.assigned_to && Number(row.assigned_to) !== Number(user.userId)) throw AppError.forbidden("This follow-up is assigned to another worker");
      Object.assign(values, { status: "resolved", resolution_note: data.note.trim(), resolved_by: user.userId, resolved_at: new Date() });
      await OutreachDelivery.update({ status: "cancelled", last_error_code: "FOLLOW_UP_RESOLVED" }, { where: { follow_up_id: row.id, status: "queued" }, transaction });
    }
    await row.update(values, { transaction });
    if (action === "assign") {
      const member = await Member.findByPk(row.member_id, { transaction });
      await require("./evaluation").notifyAssignee(row, member, transaction);
    }
    await audit(user, "FOLLOW_UP_" + action.toUpperCase(), "attendance_follow_ups", row.id, { ...values, reason: data.note }, transaction);
    return row;
  });
};
const listDeliveries = async (query, user) => {
  const pagination = pageOptions(query);
  const where = {};
  if (query.status) where.status = query.status;
  if (query.channel) where.channel = query.channel;
  if (query.follow_up_id) where.follow_up_id = query.follow_up_id;
  if (query.date_from || query.date_to) {
    where.created_at = {};
    if (query.date_from) where.created_at[Op.gte] = new Date(query.date_from + "T00:00:00+08:00");
    if (query.date_to) where.created_at[Op.lt] = new Date(new Date(query.date_to + "T00:00:00+08:00").getTime() + 86400000);
  }
  const result = await OutreachDelivery.findAndCountAll({ where, include: [await memberInclude(user, query)], order: [["created_at", "DESC"], ["id", "DESC"]], limit: pagination.limit, offset: pagination.offset });
  return { items: result.rows.map((row) => {
    const value = row.toJSON();
    value.recipient_phone = maskedPhone(value.recipient_phone);
    delete value.claim_token;
    delete value.idempotency_key;
    return value;
  }), total: result.count, page: pagination.page, limit: pagination.limit };
};
const overview = async (user) => {
  const include = [{ ...await memberInclude(user), attributes: [] }];
  const followups = await AttendanceFollowUp.findAll({ attributes: ["status", [sequelize.fn("COUNT", sequelize.col("AttendanceFollowUp.id")), "total"]], include, group: ["AttendanceFollowUp.status"], raw: true });
  const deliveries = await OutreachDelivery.findAll({ attributes: ["status", [sequelize.fn("COUNT", sequelize.col("OutreachDelivery.id")), "total"]], include, group: ["OutreachDelivery.status"], raw: true });
  return { followups: Object.fromEntries(followups.map((row) => [row.status, Number(row.total)])), deliveries: Object.fromEntries(deliveries.map((row) => [row.status, Number(row.total)])) };
};
module.exports = {
  audit, pageOptions, memberInclude, assertCaseAccess, getPreference, setPreference, listMembers, audienceIds, presenceIds,
  listSessions, setSessionPolicy, getRoster, setException, eligibleAssignees, listFollowUps, updateFollowUp, listDeliveries, overview,
  OutreachPreference, OutreachSessionPolicy, AttendanceException, AttendanceFollowUp, OutreachDelivery, OutreachDeliveryAttempt,
};
