"use strict";

const { Op } = require("sequelize");
const AppError = require("../../helpers/AppError");
const cache = require("../../helpers/cache.helper");
const { syncServiceAttendanceSummary } = require("../../helpers/attendanceSummary.helper");
const { Member } = require("../../models");
const {
  EventAttendance,
  QrServiceAttendance,
  QrAttendanceSession,
  sequelize,
} = require("./models");
const sessions = require("./sessions.service");
const batches = require("./batches.service");
const summaries = require("./summary.service");
const { getQrAttendanceAvailability } = require("./featureSettings");
const { writeQrAudit } = require("./audit");
const { invalidateSessionFinalization } = require("./reconciliation.service");
const { createEventAttendance, createServiceAttendance } = require("./attendanceWriter");
const {
  assertParentAllowsCapture,
  assertSessionCaptureOpen,
  assertSessionRegistration,
  resolveMemberQr,
} = require("./policy");
const { assertMemberInActorScope } = require("./scope");
const { getMemberScopeWhere, getScope } = require("../../helpers/scopedLeader.helper");

const respond = (res, data, status = 200) => res.status(status).json({ success: true, data });

const requireSessionRow = async (sessionId, transaction) => {
  const session = await QrAttendanceSession.findByPk(sessionId, {
    transaction,
    ...(transaction && { lock: transaction.LOCK.UPDATE }),
  });
  if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
  return session;
};

const resolveCandidateMember = async (sessionInfo, payload, memberId, user, transaction) => {
  const member = payload
    ? (await resolveMemberQr(payload, user, { transaction })).member
    : await assertMemberInActorScope(memberId, user, transaction);
  await assertSessionRegistration(sessionInfo, member.id, transaction);
  return member;
};

const findExistingCheckIn = async (session, memberId, transaction) => {
  if (session.service_id) {
    return QrServiceAttendance.findOne({
      where: { service_id: session.service_id, member_id: memberId, check_in_method: { [Op.ne]: "pre-reg" } },
      order: [["checked_in_at", "ASC"], ["id", "ASC"]],
      ...(transaction && { transaction }),
    });
  }
  return EventAttendance.findOne({
    where: { session_id: session.id, member_id: memberId },
    ...(transaction && { transaction }),
  });
};

const safeMember = (member) => ({
  id: member.id,
  first_name: member.first_name,
  last_name: member.last_name,
  status: member.status,
  profile_photo_url: member.profile_photo_url || null,
});

exports.getCapabilities = async (_req, res, next) => {
  try {
    respond(res, await getQrAttendanceAvailability());
  } catch (error) { next(error); }
};

exports.listSessions = async (req, res, next) => {
  try { respond(res, await sessions.listSessions(req.query, req.user)); } catch (error) { next(error); }
};

exports.createSession = async (req, res, next) => {
  try { respond(res, await sessions.createSession(req.body, req.user), 201); } catch (error) { next(error); }
};

exports.getSession = async (req, res, next) => {
  try { respond(res, await sessions.getSession(req.params.sessionId, req.user)); } catch (error) { next(error); }
};

exports.listRoster = async (req, res, next) => {
  try { respond(res, await sessions.listSessionRoster(req.params.sessionId, req.query, req.user)); } catch (error) { next(error); }
};

exports.addExpectedMembers = async (req, res, next) => {
  try {
    respond(res, await sessions.addExplicitExpectedMembers(
      req.params.sessionId, req.body.member_ids, req.body.reason, req.user,
    ), 201);
  } catch (error) { next(error); }
};

exports.openSession = async (req, res, next) => {
  try { respond(res, await sessions.openSession(req.params.sessionId, req.user)); } catch (error) { next(error); }
};

exports.closeSession = async (req, res, next) => {
  try { respond(res, await sessions.closeSession(req.params.sessionId, req.user)); } catch (error) { next(error); }
};

exports.finalizeSession = async (req, res, next) => {
  try {
    respond(res, await sessions.finalizeSession(req.params.sessionId, req.body, req.user));
  } catch (error) { next(error); }
};

exports.cancelSession = async (req, res, next) => {
  try { respond(res, await sessions.cancelSession(req.params.sessionId, req.body.reason, req.user)); } catch (error) { next(error); }
};

exports.getSummary = async (req, res, next) => {
  try { respond(res, await summaries.getSessionSummary(req.params.sessionId, req.user)); } catch (error) { next(error); }
};

exports.listAttendance = async (req, res, next) => {
  try {
    const session = await sessions.getSessionWithParent(req.params.sessionId);
    const scope = getScope(req.user);
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 100, 1), 100);
    const memberScope = await getMemberScopeWhere(req.user);
    const memberInclude = {
      model: Member,
      attributes: ["id", "first_name", "last_name", "status"],
      required: Boolean(memberScope),
      ...(memberScope && { where: memberScope }),
    };
    let result;
    if (session.service_id) {
      result = await QrServiceAttendance.findAndCountAll({
        where: {
          service_id: session.service_id,
          check_in_method: { [Op.ne]: "pre-reg" },
          ...(scope && { voided_at: null }),
          ...(!scope && { }),
        },
        include: [memberInclude],
        order: [["checked_in_at", "DESC"], ["id", "DESC"]],
        limit,
        offset: (page - 1) * limit,
        distinct: true,
      });
    } else {
      result = await EventAttendance.findAndCountAll({
        where: { session_id: session.id, ...(scope && { voided_at: null }) },
        include: [{ ...memberInclude, as: "member" }],
        order: [["checked_in_at", "DESC"], ["id", "DESC"]],
        limit,
        offset: (page - 1) * limit,
        distinct: true,
      });
    }
    respond(res, { records: result.rows, count: result.count, page, limit });
  } catch (error) { next(error); }
};

exports.previewMember = async (req, res, next) => {
  try {
    const sessionInfo = await sessions.getSessionWithParent(req.params.sessionId);
    assertSessionCaptureOpen(sessionInfo);
    assertParentAllowsCapture(sessionInfo);
    const member = await resolveCandidateMember(sessionInfo, req.body.qr_payload, null, req.user);
    const existing = await findExistingCheckIn(sessionInfo, member.id);
    respond(res, {
      member: safeMember(member),
      outcome: !existing ? "ready" : existing.voided_at ? "voided" : "already_confirmed",
      checked_in_at: existing?.checked_in_at || null,
    });
  } catch (error) { next(error); }
};

exports.checkInMember = async (req, res, next) => {
  try {
    let result;
    let member;
    let sessionInfo;
    await sequelize.transaction(async (transaction) => {
      await requireSessionRow(req.params.sessionId, transaction);
      sessionInfo = await sessions.getSessionWithParent(req.params.sessionId, transaction);
      assertSessionCaptureOpen(sessionInfo);
      assertParentAllowsCapture(sessionInfo);
      member = await resolveCandidateMember(
        sessionInfo, req.body.qr_payload, req.body.member_id, req.user, transaction,
      );
      const method = req.body.qr_payload ? "qr" : "manual";
      const now = new Date();
      result = sessionInfo.service_id
        ? await createServiceAttendance({
          session: sessionInfo,
          member,
          recordedBy: req.user.userId,
          confirmedBy: req.user.userId,
          method,
          entrySource: "direct",
          checkedInAt: now,
          transaction,
          user: req.user,
        })
        : await createEventAttendance({
          session: sessionInfo,
          member,
          recordedBy: req.user.userId,
          confirmedBy: req.user.userId,
          method,
          entrySource: "direct",
          checkedInAt: now,
          transaction,
        });
    });
    if (sessionInfo.service_id) {
      await syncServiceAttendanceSummary(sessionInfo.service_id);
      cache.keys("dashboard:*").forEach((key) => cache.del(key));
    }
    respond(res, {
      member: safeMember(member),
      attendance: result.record,
      outcome: result.outcome,
      created: result.created,
    }, result.created ? 201 : 200);
  } catch (error) { next(error); }
};

exports.createBatch = async (req, res, next) => {
  try {
    const result = await batches.createDraft(
      req.params.sessionId, req.body.client_request_id, req.user,
    );
    respond(res, result, result.created ? 201 : 200);
  } catch (error) { next(error); }
};

exports.listBatches = async (req, res, next) => {
  try { respond(res, await batches.listSessionsBatches(req.params.sessionId, req.query, req.user)); } catch (error) { next(error); }
};

exports.resolveBatchQr = async (req, res, next) => {
  try { respond(res, await batches.resolveBatchQr(req.body.session_id, req.body.qr_payload, req.user)); } catch (error) { next(error); }
};

exports.getBatch = async (req, res, next) => {
  try { respond(res, await batches.getBatch(req.params.batchId, req.user)); } catch (error) { next(error); }
};

exports.getBatchQrImage = async (req, res, next) => {
  try {
    const png = await batches.getBatchQrPng(req.params.batchId, req.user);
    res.set({
      "Content-Type": "image/png",
      "Cache-Control": "private, no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "attachment; filename=\"mcc-attendance-batch.png\"",
    });
    res.status(200).send(png);
  } catch (error) { next(error); }
};

exports.addBatchItem = async (req, res, next) => {
  try { respond(res, await batches.addDraftItem(req.params.batchId, req.body, req.user), 201); } catch (error) { next(error); }
};

exports.removeBatchItem = async (req, res, next) => {
  try {
    respond(res, await batches.removeDraftItem(
      req.params.batchId, req.params.memberId, req.body.expected_revision, req.user,
    ));
  } catch (error) { next(error); }
};

exports.submitBatch = async (req, res, next) => {
  try { respond(res, await batches.submitBatch(req.params.batchId, req.body.expected_revision, req.user)); } catch (error) { next(error); }
};

exports.approveBatch = async (req, res, next) => {
  try {
    const { late_approval, ...data } = req.body;
    respond(res, await batches.approveBatch(req.params.batchId, data, req.user, {
      lateApproval: late_approval,
    }));
  } catch (error) { next(error); }
};

exports.rejectBatch = async (req, res, next) => {
  try {
    respond(res, await batches.rejectBatch(
      req.params.batchId, req.body.reason, req.body.expected_revision, req.user,
    ));
  } catch (error) { next(error); }
};

exports.withdrawBatch = async (req, res, next) => {
  try {
    respond(res, await batches.withdrawBatch(
      req.params.batchId, req.body.reason, req.body.expected_revision, req.user,
    ));
  } catch (error) { next(error); }
};

exports.correctAttendance = async (req, res, next) => {
  try {
    const { sessionId, memberId } = req.params;
    const { action, reason, expected_version: expectedVersion } = req.body;
    const result = await sequelize.transaction(async (transaction) => {
      const session = await requireSessionRow(sessionId, transaction);
      const sessionInfo = await sessions.getSessionWithParent(sessionId, transaction);
      if (String(sessionInfo.target.status).toLowerCase() === "cancelled") {
        throw AppError.conflict("ACTIVITY_CANCELLED", "Attendance on a cancelled activity cannot be corrected here");
      }
      const record = session.service_id
        ? await QrServiceAttendance.findOne({
          where: { service_id: session.service_id, member_id: memberId, entry_source: { [Op.ne]: "legacy" } },
          order: [["checked_in_at", "DESC"], ["id", "DESC"]],
          transaction,
          lock: transaction.LOCK.UPDATE,
        })
        : await EventAttendance.findOne({
          where: { session_id: session.id, member_id: memberId },
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
      if (!record) throw AppError.notFound("QR_ATTENDANCE_NOT_FOUND", "QR attendance record was not found");
      const version = Number(session.service_id ? record.qr_revision : record.version);
      if (version !== Number(expectedVersion)) {
        throw AppError.conflict("ATTENDANCE_VERSION_CHANGED", "Reload this attendance record before correcting it");
      }
      if (action === "void" && record.voided_at) {
        throw AppError.conflict("ATTENDANCE_ALREADY_VOIDED", "This attendance is already voided");
      }
      if (action === "reinstate" && !record.voided_at) {
        throw AppError.conflict("ATTENDANCE_NOT_VOIDED", "Only voided attendance can be reinstated");
      }
      const before = {
        voided_by: record.voided_by,
        voided_at: record.voided_at,
        void_reason: record.void_reason,
        version,
      };
      const correction = action === "void"
        ? { voided_by: req.user.userId, voided_at: new Date(), void_reason: reason.trim() }
        : { voided_by: null, voided_at: null, void_reason: null };
      if (session.service_id) {
        correction.qr_revision = version + 1;
      } else {
        correction.version = version + 1;
      }
      await record.update(correction, { transaction });
      await writeQrAudit({
        actorId: req.user.userId,
        action: action === "void" ? "QR_ATTENDANCE_VOIDED" : "QR_ATTENDANCE_REINSTATED",
        table: session.service_id ? "attendances" : "event_attendances",
        recordId: record.id,
        oldValues: before,
        newValues: { ...correction, reason: reason.trim(), session_id: session.id, member_id: Number(memberId) },
        ipAddress: req.ip,
        transaction,
      });
      await invalidateSessionFinalization(session.id, {
        transaction,
        actorId: req.user.userId,
        reason: action === "void" ? "attendance_voided" : "attendance_reinstated",
      });
      return record;
    });
    if (result.service_id) {
      await syncServiceAttendanceSummary(result.service_id);
      cache.keys("dashboard:*").forEach((key) => cache.del(key));
    }
    respond(res, result);
  } catch (error) { next(error); }
};

const csvCell = (value) => {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
};

exports.exportSessionCsv = async (req, res, next) => {
  try {
    const session = await sessions.getSessionWithParent(req.params.sessionId);
    const scope = getScope(req.user);
    const memberScope = await getMemberScopeWhere(req.user);
    const memberInclude = {
      model: Member,
      attributes: ["id", "first_name", "last_name", "cell_group_id", "group_id"],
      required: Boolean(memberScope),
      ...(memberScope && { where: memberScope }),
    };
    const records = session.service_id
      ? await QrServiceAttendance.findAll({
        where: { service_id: session.service_id, check_in_method: { [Op.ne]: "pre-reg" }, ...(scope && { voided_at: null }) },
        include: [memberInclude],
        order: [["checked_in_at", "ASC"], ["id", "ASC"]],
        limit: 20001,
      })
      : await EventAttendance.findAll({
        where: { session_id: session.id, ...(scope && { voided_at: null }) },
        include: [{ ...memberInclude, as: "member" }],
        order: [["checked_in_at", "ASC"], ["id", "ASC"]],
        limit: 20001,
      });
    if (records.length > 20000) {
      throw AppError.conflict("EXPORT_LIMIT_REACHED", "This session has more than 20,000 rows. Use a paged export workflow or narrow the session before exporting.");
    }
    const rows = [["member_id", "first_name", "last_name", "checked_in_at", "entry_source", "capture_method"]];
    for (const record of records) {
      const member = record.Member || record.member;
      rows.push([
        member?.id || record.member_id,
        member?.first_name,
        member?.last_name,
        record.checked_in_at?.toISOString?.() || record.checked_in_at,
        record.entry_source,
        record.check_in_method,
      ]);
    }
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": `attachment; filename=\"attendance-session-${Number(session.id)}.csv\"`,
      "X-Content-Type-Options": "nosniff",
    });
    res.status(200).send(`\uFEFF${csv}`);
  } catch (error) { next(error); }
};
