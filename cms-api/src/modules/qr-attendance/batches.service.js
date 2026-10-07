"use strict";

const { createHash } = require("node:crypto");
const { Op } = require("sequelize");
const AppError = require("../../helpers/AppError");
const { CellGroup, Group, Member, User } = require("../../models");
const { getScope } = require("../../helpers/scopedLeader.helper");
const {
  AttendanceBatch: QrAttendanceBatch,
  AttendanceBatchItem: QrAttendanceBatchItem,
  QrAttendanceSession,
  sequelize,
} = require("./models");
const { writeQrAudit } = require("./audit");
const { createEventAttendance, createServiceAttendance } = require("./attendanceWriter");
const dashboardCache = require("../../helpers/cache.helper");
const { syncServiceAttendanceSummary } = require("../../helpers/attendanceSummary.helper");
const { formatQrPayload, parseQrPayload } = require("./qrPayload");
const { getSessionWithParent } = require("./sessions.service");
const { assertMemberInActorScope, getLeaderBatchScope } = require("./scope");
const { assertParentAllowsCapture, assertSessionRegistration, assertLeaderBatchSession, resolveMemberQr } = require("./policy");

const MAX_BATCH_ITEMS = 200;

const getBatchScopeWhere = (user = {}) => {
  const scope = getScope(user);
  if (!scope) return null;
  if (scope.type === "cell_group" && scope.id) return { cell_group_id: scope.id };
  if (scope.type === "group" && scope.id) return { group_id: scope.id };
  return { id: -1 };
};

const findReadableBatch = async (batchId, user, transaction) => {
  const scopeWhere = getBatchScopeWhere(user);
  const where = {
    id: batchId,
    ...(scopeWhere || {}),
    ...(getScope(user) && { submitted_by: user.userId }),
  };
  const batch = await QrAttendanceBatch.findOne({
    where,
    transaction,
    ...(transaction && { lock: transaction.LOCK.UPDATE }),
  });
  if (!batch) throw AppError.notFound("BATCH_NOT_FOUND", "Attendance batch was not found");
  return batch;
};

const loadBatchItems = (batchId, transaction) => QrAttendanceBatchItem.findAll({
  where: { batch_id: batchId },
  include: [{
    model: Member,
    as: "member",
    attributes: ["id", "first_name", "last_name", "status", "cell_group_id", "group_id"],
    required: false,
  }],
  order: [["captured_at", "ASC"], ["id", "ASC"]],
  transaction,
});

const buildBatchDigest = (items) => createHash("sha256")
  .update(JSON.stringify(items
    .map((item) => ({
      member_id: Number(item.member_id),
      captured_by: Number(item.captured_by),
      capture_method: item.capture_method,
      captured_at: new Date(item.captured_at).toISOString(),
      cell_group_id_at_capture: item.cell_group_id_at_capture || null,
      group_id_at_capture: item.group_id_at_capture || null,
    }))
    .sort((a, b) => a.member_id - b.member_id)))
  .digest("hex");

const createDraft = async (sessionId, idempotencyKey, user) => {
  const scope = getLeaderBatchScope(user);
  const sessionInfo = await getSessionWithParent(sessionId);
  assertLeaderBatchSession(sessionInfo, user);
  if (sessionInfo.status !== "open") {
    throw AppError.conflict("SESSION_NOT_OPEN", "Open the attendance session before creating a leader batch");
  }

  return sequelize.transaction(async (transaction) => {
    const session = await QrAttendanceSession.findByPk(sessionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!session) {
      throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
    }
    const existing = await QrAttendanceBatch.findOne({
      where: { submitted_by: user.userId, idempotency_key: idempotencyKey },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existing) {
      if (Number(existing.session_id) !== Number(session.id)) {
        throw AppError.conflict("IDEMPOTENCY_KEY_REUSED", "This request ID was already used for another attendance session");
      }
      return { batch: existing, created: false };
    }
    if (session.status !== "open") {
      throw AppError.conflict("SESSION_NOT_OPEN", "Attendance session is no longer open for leader drafts");
    }
    const now = Date.now();
    if (now > new Date(session.check_in_closes_at).getTime()) {
      throw AppError.conflict("CHECK_IN_CLOSED", "The check-in window has closed");
    }

    const batch = await QrAttendanceBatch.create({
      session_id: session.id,
      public_id: require("node:crypto").randomUUID(),
      submitted_by: user.userId,
      cell_group_id: scope.cell_group_id,
      group_id: scope.group_id,
      state: "draft",
      revision: 1,
      idempotency_key: idempotencyKey,
      approval_deadline: session.approval_deadline,
    }, { transaction });
    await writeQrAudit({
      actorId: user.userId,
      action: "QR_ATTENDANCE_BATCH_CREATED",
      table: "attendance_batches",
      recordId: batch.id,
      newValues: { batch_id: batch.id, session_id: session.id, scope },
      transaction,
    });
    return { batch, created: true };
  });
};

const addDraftItem = async (batchId, data, user) => sequelize.transaction(async (transaction) => {
  const initialBatch = await findReadableBatch(batchId, user);
  const sessionRow = await QrAttendanceSession.findByPk(initialBatch.session_id, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!sessionRow) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
  const batch = await findReadableBatch(batchId, user, transaction);
  if (Number(batch.submitted_by) !== Number(user.userId) || batch.state !== "draft") {
    throw AppError.conflict("BATCH_NOT_EDITABLE", "Only your own draft attendance batch can be changed");
  }
  const member = data.qr_payload
    ? (await resolveMemberQr(data.qr_payload, user, { transaction })).member
    : await assertMemberInActorScope(data.member_id, user, transaction);
  const existingItem = await QrAttendanceBatchItem.findOne({
    where: { batch_id: batch.id, member_id: member.id },
    transaction,
  });
  if (existingItem) return { batch, member, added: false, reason: "already_in_batch" };
  if (Number(data.expected_revision) !== Number(batch.revision)) {
    throw AppError.conflict("BATCH_REVISION_CHANGED", "Reload this batch before adding another attendee");
  }

  const sessionInfo = await getSessionWithParent(batch.session_id, transaction);
  assertLeaderBatchSession(sessionInfo, user);
  assertParentAllowsCapture(sessionInfo);
  if (sessionInfo.status !== "open") throw AppError.conflict("SESSION_NOT_OPEN", "This attendance session is closed");
  const captureTime = new Date();
  if (captureTime < new Date(sessionInfo.check_in_opens_at) || captureTime > new Date(sessionInfo.check_in_closes_at)) {
    throw AppError.conflict("CHECK_IN_WINDOW_CLOSED", "Members can only be added during the check-in window");
  }

  if (sessionInfo.registration_required) {
    await assertSessionRegistration(sessionInfo, member.id, transaction);
  }

  const itemCount = await QrAttendanceBatchItem.count({ where: { batch_id: batch.id }, transaction });
  if (itemCount >= MAX_BATCH_ITEMS) {
    throw AppError.conflict("BATCH_LIMIT_REACHED", "This batch is full. Submit it before starting another batch.");
  }

  const item = await QrAttendanceBatchItem.create({
    batch_id: batch.id,
    member_id: member.id,
    captured_by: user.userId,
    capture_method: data.qr_payload ? "qr" : "manual",
    captured_at: captureTime,
    cell_group_id_at_capture: member.cell_group_id || null,
    group_id_at_capture: member.group_id || null,
    outcome: "pending",
  }, { transaction });
  await batch.update({ revision: Number(batch.revision) + 1 }, { transaction });
  await writeQrAudit({
    actorId: user.userId,
    action: "QR_ATTENDANCE_BATCH_ITEM_ADDED",
    table: "attendance_batch_items",
    recordId: item.id,
    newValues: {
      batch_id: batch.id,
      session_id: sessionInfo.id,
      member_id: member.id,
      capture_method: item.capture_method,
    },
    transaction,
  });
  return { batch, member, item, added: true };
});

const assertDraftOwner = (batch, user) => {
  if (Number(batch.submitted_by) !== Number(user.userId) || batch.state !== "draft") {
    throw AppError.conflict("BATCH_NOT_EDITABLE", "Only your own draft attendance batch can be changed");
  }
  const actorScope = getLeaderBatchScope(user);
  if (Number(batch.cell_group_id || 0) !== Number(actorScope.cell_group_id || 0)
      || Number(batch.group_id || 0) !== Number(actorScope.group_id || 0)) {
    throw AppError.forbidden("This batch is outside your current leader assignment");
  }
};

const removeDraftItem = async (batchId, memberId, expectedRevision, user) =>
  sequelize.transaction(async (transaction) => {
    const batch = await findReadableBatch(batchId, user, transaction);
    assertDraftOwner(batch, user);
    if (Number(expectedRevision) !== Number(batch.revision)) {
      throw AppError.conflict("BATCH_REVISION_CHANGED", "Reload this batch before removing an attendee");
    }
    const item = await QrAttendanceBatchItem.findOne({
      where: { batch_id: batch.id, member_id: memberId },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!item) throw AppError.notFound("BATCH_ITEM_NOT_FOUND", "Member was not found in this draft");
    await item.destroy({ transaction });
    const revision = Number(batch.revision) + 1;
    await batch.update({ revision }, { transaction });
    await writeQrAudit({
      actorId: user.userId,
      action: "QR_ATTENDANCE_BATCH_ITEM_REMOVED",
      table: "attendance_batches",
      recordId: batch.id,
      newValues: { batch_id: batch.id, member_id: memberId },
      transaction,
    });
    return { batch_id: batch.id, revision };
  });

const submitBatch = async (batchId, expectedRevision, user) =>
  sequelize.transaction(async (transaction) => {
    const initialBatch = await findReadableBatch(batchId, user);
    const session = await QrAttendanceSession.findByPk(initialBatch.session_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
    const batch = await findReadableBatch(batchId, user, transaction);
    if (batch.state === "submitted") {
      const itemCount = await QrAttendanceBatchItem.count({ where: { batch_id: batch.id }, transaction });
      return { batch, payload: formatQrPayload("batch", batch.public_id), item_count: itemCount, idempotent: true };
    }
    assertDraftOwner(batch, user);
    if (Number(expectedRevision) !== Number(batch.revision)) {
      throw AppError.conflict("BATCH_REVISION_CHANGED", "Reload this batch before submitting");
    }
    if (!session || !["open", "closed"].includes(session.status)) {
      throw AppError.conflict("SESSION_NOT_OPEN", "This attendance session is no longer accepting batch submissions");
    }
    if (Date.now() > new Date(session.approval_deadline).getTime()) {
      throw new AppError("BATCH_SUBMISSION_EXPIRED", 410, "The leader batch submission window has expired");
    }
    const items = await QrAttendanceBatchItem.findAll({
      where: { batch_id: batch.id },
      order: [["member_id", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!items.length) throw AppError.badRequest("BATCH_EMPTY", "Add at least one attendee before submitting");
    if (items.length > MAX_BATCH_ITEMS) {
      throw AppError.conflict("BATCH_LIMIT_REACHED", "Split this roster into batches of 200 members or fewer");
    }
    const opensAt = new Date(session.check_in_opens_at).getTime();
    const closesAt = new Date(session.check_in_closes_at).getTime();
    if (items.some((item) => {
      const capturedAt = new Date(item.captured_at).getTime();
      return capturedAt < opensAt || capturedAt > closesAt;
    })) {
      throw AppError.conflict("BATCH_CAPTURE_OUTSIDE_WINDOW", "Every attendee must be recorded during this session's check-in window");
    }

    const digest = buildBatchDigest(items);
    await batch.update({
      state: "submitted",
      content_digest: digest,
      submitted_at: new Date(),
      revision: Number(batch.revision) + 1,
    }, { transaction });
    await writeQrAudit({
      actorId: user.userId,
      action: "QR_ATTENDANCE_BATCH_SUBMITTED",
      table: "attendance_batches",
      recordId: batch.id,
      newValues: { batch_id: batch.id, session_id: session.id, item_count: items.length },
      transaction,
    });
    return { batch, payload: formatQrPayload("batch", batch.public_id), item_count: items.length };
  });

const withdrawBatch = async (batchId, reason, expectedRevision, user) =>
  sequelize.transaction(async (transaction) => {
    const batch = await findReadableBatch(batchId, user, transaction);
    if (Number(batch.submitted_by) !== Number(user.userId)) {
      throw AppError.forbidden("Only the leader who submitted this batch can withdraw it");
    }
    if (!["draft", "submitted"].includes(batch.state)) {
      throw AppError.conflict("BATCH_NOT_WITHDRAWABLE", "Only a draft or unreviewed submission can be withdrawn");
    }
    if (Number(expectedRevision) !== Number(batch.revision)) {
      throw AppError.conflict("BATCH_REVISION_CHANGED", "Reload this batch before withdrawing it");
    }
    await batch.update({
      state: "withdrawn",
      decision_reason: reason || null,
      revision: Number(batch.revision) + 1,
    }, { transaction });
    await writeQrAudit({
      actorId: user.userId,
      action: "QR_ATTENDANCE_BATCH_WITHDRAWN",
      table: "attendance_batches",
      recordId: batch.id,
      newValues: { batch_id: batch.id, reason: reason || null },
      transaction,
    });
    return batch;
  });

const rejectBatch = async (batchId, reason, expectedRevision, user) =>
  sequelize.transaction(async (transaction) => {
    const batch = await QrAttendanceBatch.findByPk(batchId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!batch) throw AppError.notFound("BATCH_NOT_FOUND", "Attendance batch was not found");
    if (batch.state !== "submitted") {
      throw AppError.conflict("BATCH_NOT_REVIEWABLE", "Only a pending submission can be rejected");
    }
    if (Number(expectedRevision) !== Number(batch.revision)) {
      throw AppError.conflict("BATCH_REVISION_CHANGED", "Reload this batch before rejecting it");
    }
    await batch.update({
      state: "rejected",
      reviewed_by: user.userId,
      reviewed_at: new Date(),
      decision_reason: reason.trim(),
      revision: Number(batch.revision) + 1,
    }, { transaction });
    await writeQrAudit({
      actorId: user.userId,
      action: "QR_ATTENDANCE_BATCH_REJECTED",
      table: "attendance_batches",
      recordId: batch.id,
      newValues: { batch_id: batch.id, reason: reason.trim() },
      transaction,
    });
    return batch;
  });

const listSessionsBatches = async (sessionId, { state, limit = 50, page = 1 } = {}, user) => {
  const where = { session_id: sessionId };
  if (state) where.state = state;
  const scope = getScope(user);
  if (scope?.type === "cell_group") {
    where.cell_group_id = scope.id || -1;
    where.submitted_by = user.userId;
  } else if (scope?.type === "group") {
    where.group_id = scope.id || -1;
    where.submitted_by = user.userId;
  }
  else if (scope?.type === "ministry") return { batches: [], total: 0 };
  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const result = await QrAttendanceBatch.findAndCountAll({
    where,
    include: [{
      model: QrAttendanceSession,
      required: false,
      as: "session",
      attributes: ["id", "title", "session_key", "service_id", "event_id", "starts_at", "ends_at"],
    }, {
      model: CellGroup,
      required: false,
      as: "cellGroup",
      attributes: ["id", "name"],
    }, {
      model: Group,
      required: false,
      as: "group",
      attributes: ["id", "name"],
    }, {
      model: User,
      required: false,
      as: "submitter",
      attributes: ["id"],
      include: [{
        model: Member,
        as: "member",
        attributes: ["id", "first_name", "last_name"],
        required: false,
      }],
    }],
    order: [["created_at", "DESC"], ["id", "DESC"]],
    limit: pageSize,
    offset: (pageNumber - 1) * pageSize,
    distinct: true,
  });
  return { batches: result.rows, total: result.count, page: pageNumber, limit: pageSize };
};

const getBatch = async (batchId, user) => {
  const batch = await findReadableBatch(batchId, user);
  const items = await loadBatchItems(batch.id);
  const [submitterRecord, session, cellGroup, group] = await Promise.all([
    User.findByPk(batch.submitted_by, {
      attributes: ["id"],
      include: [{ model: Member, as: "member", attributes: ["id", "first_name", "last_name"], required: false }],
    }),
    getSessionWithParent(batch.session_id),
    batch.cell_group_id ? CellGroup.findByPk(batch.cell_group_id, { attributes: ["id", "name"] }) : null,
    batch.group_id ? Group.findByPk(batch.group_id, { attributes: ["id", "name"] }) : null,
  ]);
  const receipt = batch.state === "approved"
    ? {
      newly_confirmed_count: items.filter((item) => item.outcome === "confirmed").length,
      already_confirmed_count: items.filter((item) => item.outcome === "already_confirmed").length,
    }
    : null;
  return {
    batch,
    items,
    session,
    submitter: {
      id: submitterRecord?.id || batch.submitted_by,
      name: submitterRecord?.member
        ? `${submitterRecord.member.first_name} ${submitterRecord.member.last_name}`.trim()
        : null,
    },
    scope: cellGroup || group,
    ...(receipt && { receipt }),
  };
};

const resolveBatchQr = async (sessionId, payload, user) => {
  const parsed = parseQrPayload(payload);
  if (!parsed) throw AppError.badRequest("QR_INVALID", "This image does not contain a supported attendance QR");
  if (parsed.kind !== "batch") throw AppError.badRequest("QR_KIND_MISMATCH", "Scan a leader batch QR in the batch review screen");
  const batch = await QrAttendanceBatch.findOne({ where: { public_id: parsed.publicId } });
  if (!batch) throw AppError.notFound("BATCH_UNAVAILABLE", "This attendance batch QR is unavailable");
  if (Number(batch.session_id) !== Number(sessionId)) {
    throw AppError.conflict("BATCH_SESSION_MISMATCH", "This batch belongs to a different service/event session");
  }
  if (!["submitted", "approved"].includes(batch.state)) {
    throw AppError.conflict("BATCH_NOT_SUBMITTED", "This batch QR is not ready for review");
  }
  return getBatch(batch.id, user);
};

const getApprovalContext = async (sessionId, { lateApproval, lateReason, transaction } = {}) => {
  const sessionInfo = await getSessionWithParent(sessionId, transaction);
  if (sessionInfo.status === "cancelled") {
    throw AppError.conflict("SESSION_CANCELLED", "Cancelled sessions cannot approve attendance batches");
  }
  const targetStatus = String(sessionInfo.target.status || "").toLowerCase();
  if (targetStatus === "cancelled") {
    throw AppError.conflict("ACTIVITY_CANCELLED", "Cancelled activities cannot approve attendance batches");
  }
  const late = Date.now() > new Date(sessionInfo.approval_deadline).getTime();
  if (late && (!lateApproval || String(lateReason || "").trim().length < 5)) {
    throw new AppError("BATCH_APPROVAL_EXPIRED", 410, "This batch approval window has expired");
  }
  return { sessionInfo, late };
};

const approveBatchAttempt = async (batchId, data, user, { lateApproval = false } = {}) =>
  sequelize.transaction(async (transaction) => {
    const initialBatch = await findReadableBatch(batchId, user);
    const lockedSession = await QrAttendanceSession.findByPk(initialBatch.session_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!lockedSession) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
    const batch = await findReadableBatch(batchId, user, transaction);
    if (!batch) throw AppError.notFound("BATCH_NOT_FOUND", "Attendance batch was not found");
    if (batch.state === "approved") {
      if (String(batch.content_digest) !== String(data.content_digest)) {
        throw AppError.conflict("BATCH_RECEIPT_MISMATCH", "This approval request does not match the saved batch receipt");
      }
      const confirmed = await QrAttendanceBatchItem.count({
        where: { batch_id: batch.id, outcome: "confirmed" },
        transaction,
      });
      const duplicates = await QrAttendanceBatchItem.count({
        where: { batch_id: batch.id, outcome: "already_confirmed" },
        transaction,
      });
      return {
        batch,
        idempotent: true,
        newly_confirmed_count: confirmed,
        already_confirmed_count: duplicates,
      };
    }
    if (batch.state !== "submitted") {
      throw AppError.conflict("BATCH_NOT_REVIEWABLE", "Only a pending submission can be approved");
    }
    if (Number(data.expected_revision) !== Number(batch.revision)) {
      throw AppError.conflict("BATCH_REVISION_CHANGED", "Reload this batch before approval");
    }

    const items = await QrAttendanceBatchItem.findAll({
      where: { batch_id: batch.id },
      order: [["member_id", "ASC"], ["id", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!items.length || items.length > MAX_BATCH_ITEMS) {
      throw AppError.conflict("BATCH_CONTENT_INVALID", "This batch does not contain a valid attendee list");
    }
    const digest = buildBatchDigest(items);
    if (digest !== String(data.content_digest) || batch.content_digest !== digest) {
      throw AppError.conflict("BATCH_RECEIPT_MISMATCH", "The attendee list has changed; reject it and request a corrected batch");
    }

    const { sessionInfo, late } = await getApprovalContext(batch.session_id, {
      lateApproval,
      lateReason: data.late_approval_reason,
      transaction,
    });
    const session = sessionInfo;
    const captureStart = new Date(session.check_in_opens_at).getTime();
    const captureEnd = new Date(session.check_in_closes_at).getTime();
    if (items.some((item) => {
      const capturedAt = new Date(item.captured_at).getTime();
      return capturedAt < captureStart || capturedAt > captureEnd;
    })) {
      throw AppError.conflict("BATCH_CAPTURE_OUTSIDE_WINDOW", "The batch contains entries outside this session's check-in window");
    }

    const memberIds = [...new Set(items.map((item) => Number(item.member_id)))];
    const members = await Member.findAll({
      where: { id: { [Op.in]: memberIds } },
      attributes: ["id"],
      transaction,
    });
    const memberIdsStillAvailable = new Set(members.map((member) => Number(member.id)));
    if (memberIdsStillAvailable.size !== memberIds.length) {
      throw AppError.conflict("BATCH_MEMBER_UNAVAILABLE", "A member in this batch is no longer available; reject it with a reason and request a corrected batch");
    }

    let newlyConfirmed = 0;
    let alreadyConfirmed = 0;
    for (const item of items) {
      const member = {
        id: item.member_id,
        cell_group_id: item.cell_group_id_at_capture,
        group_id: item.group_id_at_capture,
      };
      const result = session.service_id
        ? await createServiceAttendance({
          session,
          member,
          recordedBy: item.captured_by,
          confirmedBy: user.userId,
          method: item.capture_method,
          entrySource: "leader_batch",
          batchId: batch.id,
          checkedInAt: item.captured_at,
          transaction,
        })
        : await createEventAttendance({
          session,
          member,
          recordedBy: item.captured_by,
          confirmedBy: user.userId,
          method: item.capture_method,
          entrySource: "leader_batch",
          batchId: batch.id,
          checkedInAt: item.captured_at,
          transaction,
        });

      await item.update({
        outcome: result.created ? "confirmed" : "already_confirmed",
        service_attendance_id: session.service_id ? result.record.id : null,
        event_attendance_id: session.event_id ? result.record.id : null,
      }, { transaction });
      if (result.created) newlyConfirmed += 1;
      else alreadyConfirmed += 1;
    }

    await batch.update({
      state: "approved",
      reviewed_by: user.userId,
      reviewed_at: new Date(),
      decision_reason: late ? String(data.late_approval_reason).trim() : null,
      revision: Number(batch.revision) + 1,
    }, { transaction });
    await writeQrAudit({
      actorId: user.userId,
      action: late ? "QR_ATTENDANCE_BATCH_APPROVED_LATE" : "QR_ATTENDANCE_BATCH_APPROVED",
      table: "attendance_batches",
      recordId: batch.id,
      newValues: {
        batch_id: batch.id,
        session_id: session.id,
        newly_confirmed_count: newlyConfirmed,
        already_confirmed_count: alreadyConfirmed,
        late_approval_reason: late ? String(data.late_approval_reason).trim() : null,
      },
      transaction,
    });
    return {
      batch,
      idempotent: false,
      newly_confirmed_count: newlyConfirmed,
      already_confirmed_count: alreadyConfirmed,
    };
  });

const isDuplicateWriteError = (error) =>
  error?.name === "SequelizeUniqueConstraintError"
  || error?.original?.code === "ER_DUP_ENTRY"
  || Number(error?.original?.errno) === 1062;

const approveBatch = async (batchId, data, user, options = {}) => {
  let result;
  try {
    result = await approveBatchAttempt(batchId, data, user, options);
  } catch (error) {
    if (!isDuplicateWriteError(error)) throw error;
    // A direct check-in may win a per-session/member uniqueness race while
    // this batch is committing. Re-read once; the retried approval records it
    // as an explicit duplicate instead of partially applying the roster.
    result = await approveBatchAttempt(batchId, data, user, options);
  }

  if (!result.idempotent && result.batch.state === "approved") {
    const { session_id: sessionId } = result.batch;
    const session = await QrAttendanceSession.findByPk(sessionId, { attributes: ["service_id"] });
    if (session?.service_id) await syncServiceAttendanceSummary(session.service_id);
    dashboardCache.keys("dashboard:*").forEach((key) => dashboardCache.del(key));
  }
  return result;
};

const getBatchQrPng = async (batchId, user) => {
  const { batch } = await getBatch(batchId, user);
  if (!["submitted", "approved"].includes(batch.state)) {
    throw AppError.conflict("BATCH_NOT_SUBMITTED", "Submit this attendance batch before downloading its QR");
  }
  const QRCode = require("qrcode");
  return QRCode.toBuffer(formatQrPayload("batch", batch.public_id), {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 4,
    width: 512,
  });
};

module.exports = {
  addDraftItem,
  approveBatch,
  createDraft,
  getBatch,
  getBatchQrPng,
  listSessionsBatches,
  rejectBatch,
  removeDraftItem,
  resolveBatchQr,
  submitBatch,
  withdrawBatch,
};
