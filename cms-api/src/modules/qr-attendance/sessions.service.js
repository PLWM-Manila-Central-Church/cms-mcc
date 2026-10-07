"use strict";

const { Op } = require("sequelize");
const AppError = require("../../helpers/AppError");
const { Event, EventRegistration, Member, Service, ServiceResponse } = require("../../models");
const { getMemberScopeWhere, getScope } = require("../../helpers/scopedLeader.helper");
const {
  AttendanceBatch,
  AttendanceExpectedMember,
  QrAttendanceSession,
  sequelize,
} = require("./models");
const { writeQrAudit } = require("./audit");

const MAX_ROSTER_ADD = 200;

const lookupParent = async (targetType, targetId, transaction) => {
  if (targetType === "service") {
    const service = await Service.findByPk(targetId, { transaction });
    if (!service) throw AppError.notFound("SERVICE_NOT_FOUND", "Service was not found");
    return service;
  }
  if (targetType === "event") {
    const event = await Event.findByPk(targetId, { transaction });
    if (!event) throw AppError.notFound("EVENT_NOT_FOUND", "Event was not found");
    return event;
  }
  throw AppError.badRequest("INVALID_SESSION_TARGET", "Choose a Service or Event");
};

const getSessionWithParent = async (sessionId, transaction) => {
  const session = await QrAttendanceSession.findByPk(sessionId, {
    ...(transaction && { transaction }),
  });
  if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
  const targetType = session.service_id ? "service" : "event";
  const targetId = session.service_id || session.event_id;
  const target = await lookupParent(targetType, targetId, transaction);
  return { ...session.toJSON(), target_type: targetType, target: target.toJSON() };
};

const readExpectedMembers = async ({ session, targetType, transaction }) => {
  if (session.expected_basis === "none") return [];
  if (session.expected_basis === "explicit_roster") {
    return AttendanceExpectedMember.findAll({
      where: { session_id: session.id },
      attributes: ["member_id", "source", "created_at"],
      raw: true,
      transaction,
    });
  }
  const rows = targetType === "event"
    ? await EventRegistration.findAll({
      where: { event_id: session.event_id },
      attributes: ["member_id"],
      raw: true,
      transaction,
    })
    : await ServiceResponse.findAll({
      where: { service_id: session.service_id, attendance_status: "ATTENDING" },
      attributes: ["member_id"],
      raw: true,
      transaction,
    });
  return [...new Set(rows.map((row) => Number(row.member_id)).filter(Number.isSafeInteger))];
};

const snapshotExpectedMembers = async ({ session, targetType, transaction }) => {
  if (session.expected_basis === "none") {
    await session.update({ expected_roster_frozen_at: new Date() }, { transaction });
    return null;
  }
  const rows = await readExpectedMembers({ session, targetType, transaction });
  const memberIds = rows.map((row) => Number(typeof row === "object" ? row.member_id : row));
  if (session.expected_basis === "explicit_roster" && memberIds.length === 0) {
    throw AppError.conflict("EXPECTED_ROSTER_EMPTY", "Add the expected roster before opening this session");
  }
  const uniqueIds = [...new Set(memberIds)];
  const expectedRows = await AttendanceExpectedMember.findAll({
    where: { session_id: session.id },
    attributes: ["member_id", "source", "created_at"],
    raw: true,
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  const existingByMemberId = new Map(expectedRows.map((row) => [Number(row.member_id), row]));
  const members = uniqueIds.length
    ? await Member.findAll({
      where: { id: { [Op.in]: uniqueIds }, is_deleted: 0 },
      attributes: ["id", "cell_group_id", "group_id"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    })
    : [];
  if (members.length !== uniqueIds.length) {
    throw AppError.conflict(
      "EXPECTED_MEMBER_UNAVAILABLE",
      "An expected member is no longer available. Review the roster before opening this session",
    );
  }
  const membersById = new Map(members.map((member) => [Number(member.id), member]));
  const source = session.expected_basis === "explicit_roster"
    ? "staff_added"
    : targetType === "event" ? "event_registration" : "service_rsvp";
  const capturedAt = new Date();
  const frozenRows = uniqueIds.map((id) => {
    const member = membersById.get(id);
    const existing = existingByMemberId.get(id);
    return {
      session_id: session.id,
      member_id: member.id,
      source: existing?.source || source,
      cell_group_id_at_freeze: member.cell_group_id || null,
      group_id_at_freeze: member.group_id || null,
      created_at: existing?.created_at || capturedAt,
    };
  });
  if (frozenRows.length) {
    // Explicit rosters are saved while the session is a draft. Upsert their
    // freeze-time group snapshots instead of inserting duplicate session/member
    // keys when the session opens.
    await AttendanceExpectedMember.bulkCreate(frozenRows, {
      updateOnDuplicate: ["cell_group_id_at_freeze", "group_id_at_freeze"],
      transaction,
    });
  }
  await session.update({ expected_roster_frozen_at: capturedAt }, { transaction });
  return uniqueIds.length;
};

const createSession = async (data, user) => {
  const targetType = data.target_type;
  const targetId = Number(data.target_id);
  const createdId = await sequelize.transaction(async (transaction) => {
    const parent = await lookupParent(targetType, targetId, transaction);
    const parentStatus = String(parent.status || "").toLowerCase();
    if (targetType === "service" && ["cancelled", "completed"].includes(parentStatus)) {
      throw AppError.conflict("ACTIVITY_CLOSED", "Cancelled or completed services cannot add an attendance session");
    }
    if (targetType === "event" && ["cancelled", "completed"].includes(parentStatus)) {
      throw AppError.conflict("ACTIVITY_CLOSED", "Cancelled or completed events cannot add an attendance session");
    }
    const where = targetType === "service"
      ? { service_id: targetId }
      : { event_id: targetId, session_key: data.session_key };
    const existing = await QrAttendanceSession.findOne({ where, transaction });
    if (existing) {
      throw AppError.conflict("ATTENDANCE_SESSION_EXISTS", "An attendance session already exists for this activity/session key");
    }
    if (data.registration_required && targetType !== "event") {
      throw AppError.badRequest("INVALID_REGISTRATION_POLICY", "Service attendance cannot require Event registration");
    }
    if (data.registration_required && data.expected_basis !== "registrations") {
      throw AppError.badRequest("INVALID_EXPECTED_BASIS", "Registration-required sessions must use the registration roster");
    }
    if (data.expected_basis === "registrations" && !data.registration_required) {
      throw AppError.badRequest("INVALID_EXPECTED_BASIS", "Registration counts require a registration-required session");
    }
    const session = await QrAttendanceSession.create({
      service_id: targetType === "service" ? targetId : null,
      event_id: targetType === "event" ? targetId : null,
      session_key: data.session_key,
      title: data.title,
      starts_at: new Date(data.starts_at),
      ends_at: new Date(data.ends_at),
      check_in_opens_at: new Date(data.check_in_opens_at),
      check_in_closes_at: new Date(data.check_in_closes_at),
      approval_deadline: new Date(data.approval_deadline),
      time_zone: data.time_zone || "Asia/Manila",
      expected_basis: data.expected_basis || "none",
      registration_required: Boolean(data.registration_required),
      leader_confirmation_mode: data.leader_confirmation_mode || "batch_review",
      status: "draft",
      created_by: user.userId,
    }, { transaction });
    await writeQrAudit({
      actorId: user.userId,
      action: "QR_SESSION_CREATED",
      table: "attendance_sessions",
      recordId: session.id,
      newValues: {
        session_id: session.id,
        target_type: targetType,
        target_id: targetId,
        session_key: session.session_key,
        expected_basis: session.expected_basis,
      },
      transaction,
    });
    return session.id;
  });
  return getSessionWithParent(createdId);
};

const addExplicitExpectedMembers = async (sessionId, memberIds, reason, user) => {
  const uniqueIds = [...new Set(memberIds.map(Number))];
  if (!uniqueIds.length || uniqueIds.length > MAX_ROSTER_ADD) {
    throw AppError.badRequest("INVALID_ROSTER_SIZE", "Add between 1 and 200 members at a time");
  }
  return sequelize.transaction(async (transaction) => {
    const session = await QrAttendanceSession.findByPk(sessionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
    if (session.status !== "draft" || session.expected_basis !== "explicit_roster") {
      throw AppError.conflict("EXPECTED_ROSTER_LOCKED", "The explicit expected roster is locked");
    }
    const members = await Member.findAll({
      where: { id: { [Op.in]: uniqueIds } },
      attributes: ["id", "cell_group_id", "group_id"],
      transaction,
    });
    if (members.length !== uniqueIds.length) {
      throw AppError.badRequest("MEMBER_NOT_AVAILABLE", "One or more members are unavailable for the expected roster");
    }
    const existing = await AttendanceExpectedMember.findAll({
      where: { session_id: session.id, member_id: { [Op.in]: uniqueIds } },
      attributes: ["member_id"],
      raw: true,
      transaction,
    });
    const existingIds = new Set(existing.map((row) => Number(row.member_id)));
    const newMembers = members.filter((member) => !existingIds.has(Number(member.id)));
    if (newMembers.length) {
      const capturedAt = new Date();
      await AttendanceExpectedMember.bulkCreate(newMembers.map((member) => ({
        session_id: session.id,
        member_id: member.id,
        source: "staff_added",
        cell_group_id_at_freeze: member.cell_group_id || null,
        group_id_at_freeze: member.group_id || null,
        created_at: capturedAt,
      })), { transaction });
    }
    await writeQrAudit({
      actorId: user.userId,
      action: "QR_EXPECTED_ROSTER_MEMBERS_ADDED",
      table: "attendance_sessions",
      recordId: session.id,
      newValues: { session_id: session.id, added_count: newMembers.length, reason },
      transaction,
    });
    return { added_count: newMembers.length, already_present_count: existingIds.size };
  });
};

const openSession = async (sessionId, user) => sequelize.transaction(async (transaction) => {
  const session = await QrAttendanceSession.findByPk(sessionId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
  if (session.status === "open") {
    const expectedCount = session.expected_basis === "none"
      ? null
      : await AttendanceExpectedMember.count({ where: { session_id: session.id }, distinct: true, col: "member_id", transaction });
    return { session_id: session.id, status: "open", expected_count: expectedCount, already_open: true };
  }
  if (session.status !== "draft") throw AppError.conflict("SESSION_NOT_DRAFT", "Only a draft attendance session can be opened");
  const targetType = session.service_id ? "service" : "event";
  const target = await lookupParent(targetType, session.service_id || session.event_id, transaction);
  if (targetType === "service" && String(target.status).toLowerCase() !== "published") {
    throw AppError.conflict("SERVICE_NOT_PUBLISHED", "Publish the service before opening QR attendance");
  }
  if (targetType === "event" && !["upcoming", "ongoing", "published"].includes(String(target.status).toLowerCase())) {
    throw AppError.conflict("EVENT_NOT_OPEN", "Only an open event can take attendance");
  }
  if (new Date(session.ends_at) <= new Date()) {
    throw AppError.conflict("SESSION_ALREADY_ENDED", "This attendance session's end time has passed");
  }
  const expectedCount = await snapshotExpectedMembers({ session, targetType, transaction });
  await session.update({ status: "open" }, { transaction });
  await writeQrAudit({
    actorId: user.userId,
    action: "QR_SESSION_OPENED",
    table: "attendance_sessions",
    recordId: session.id,
    newValues: { session_id: session.id, expected_count: expectedCount },
    transaction,
  });
  return { session_id: session.id, status: "open", expected_count: expectedCount };
});

const closeSession = async (sessionId, user) => sequelize.transaction(async (transaction) => {
  const session = await QrAttendanceSession.findByPk(sessionId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
  if (session.status === "closed") return session;
  if (session.status !== "open") throw AppError.conflict("SESSION_NOT_OPEN", "Only an open attendance session can be closed");
  const captureClosedAt = new Date();
  await session.update({ status: "closed", capture_closed_at: captureClosedAt }, { transaction });
  await writeQrAudit({
    actorId: user.userId,
    action: "QR_SESSION_CLOSED",
    table: "attendance_sessions",
    recordId: session.id,
    newValues: { session_id: session.id, capture_closed_at: captureClosedAt },
    transaction,
  });
  return session;
});

const finalizeSession = async (sessionId, { expected_activity_revision: expectedRevision, reason }, user) =>
  sequelize.transaction(async (transaction) => {
    const session = await QrAttendanceSession.findByPk(sessionId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
    if (session.status !== "closed") {
      throw AppError.conflict("SESSION_NOT_CLOSED", "Close the attendance session before finalizing its expected roster");
    }
    if (session.expected_basis === "none") {
      throw AppError.conflict("EXPECTED_BASIS_REQUIRED", "This session has no expected roster to reconcile");
    }

    const activityRevision = Number(session.activity_revision || 1);
    if (Number(expectedRevision) !== activityRevision) {
      throw AppError.conflict("SESSION_ACTIVITY_CHANGED", "Attendance changed after this report loaded; refresh before finalizing");
    }
    if (session.finalized_at && Number(session.finalized_revision) === activityRevision) {
      return {
        session_id: session.id,
        finalized: true,
        already_finalized: true,
        finalized_at: session.finalized_at,
        finalized_revision: session.finalized_revision,
      };
    }

    const unresolvedBatchCount = await AttendanceBatch.count({
      where: { session_id: session.id, state: ["draft", "submitted"] },
      transaction,
    });
    if (unresolvedBatchCount > 0) {
      throw AppError.conflict(
        "SESSION_BATCHES_UNRESOLVED",
        "Submit, withdraw, or review every saved draft and submitted batch before finalizing",
      );
    }

    const expectedCount = await AttendanceExpectedMember.count({
      where: { session_id: session.id },
      distinct: true,
      col: "member_id",
      transaction,
    });
    const table = session.service_id ? "attendances" : "event_attendances";
    const attendanceJoin = session.service_id
      ? "a.service_id = :targetId AND a.check_in_method <> 'pre-reg'"
      : "a.session_id = :sessionId";
    const attendanceReplacements = {
      sessionId: Number(session.id),
      targetId: Number(session.service_id || session.id),
    };
    const countRows = await sequelize.query(`
      SELECT COUNT(DISTINCT expected.member_id) AS confirmed_expected_count
      FROM attendance_expected_members expected
      JOIN ${table} a
        ON a.member_id = expected.member_id
       AND ${attendanceJoin}
       AND a.voided_at IS NULL
      WHERE expected.session_id = :sessionId
    `, {
      replacements: attendanceReplacements,
      type: sequelize.QueryTypes.SELECT,
      transaction,
    });
    const confirmedExpectedCount = Number(countRows[0]?.confirmed_expected_count || 0);
    const finalAbsentCount = Math.max(0, Number(expectedCount) - confirmedExpectedCount);
    const finalizedAt = new Date();

    await session.update({
      finalized_at: finalizedAt,
      finalized_by: user.userId,
      finalized_revision: activityRevision,
    }, { transaction });
    await writeQrAudit({
      actorId: user.userId,
      action: "QR_SESSION_FINALIZED",
      table: "attendance_sessions",
      recordId: session.id,
      newValues: {
        session_id: Number(session.id),
        expected_count: Number(expectedCount),
        confirmed_expected_count: confirmedExpectedCount,
        final_absent_count: finalAbsentCount,
        activity_revision: activityRevision,
        reason: reason.trim(),
      },
      transaction,
    });

    return {
      session_id: session.id,
      finalized: true,
      already_finalized: false,
      finalized_at: finalizedAt,
      finalized_revision: activityRevision,
      expected_count: Number(expectedCount),
      confirmed_expected_count: confirmedExpectedCount,
      final_absent_count: finalAbsentCount,
    };
  });

const cancelSession = async (sessionId, reason, user) => sequelize.transaction(async (transaction) => {
  const session = await QrAttendanceSession.findByPk(sessionId, {
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
  if (session.status === "cancelled") return session;
  if (!["draft", "open"].includes(session.status)) {
    throw AppError.conflict("SESSION_NOT_CANCELLABLE", "Only a draft or open attendance session can be cancelled");
  }
  await session.update({ status: "cancelled" }, { transaction });
  await writeQrAudit({
    actorId: user.userId,
    action: "QR_SESSION_CANCELLED",
    table: "attendance_sessions",
    recordId: session.id,
    newValues: { session_id: session.id, reason },
    transaction,
  });
  return session;
});

const getSession = (sessionId) => getSessionWithParent(sessionId);

const listSessions = async ({ target_type, target_id, status, limit = 50, page = 1 }) => {
  const where = {};
  if (target_type === "service" && target_id) where.service_id = Number(target_id);
  if (target_type === "event" && target_id) where.event_id = Number(target_id);
  if (status) where.status = status;
  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const sessions = await QrAttendanceSession.findAll({
    where,
    include: [
      { model: Service, as: "service", attributes: ["id", "title", "service_date", "service_time", "status"], required: false },
      { model: Event, as: "event", attributes: ["id", "title", "start_date", "end_date", "start_time", "status"], required: false },
    ],
    order: [["starts_at", "ASC"], ["id", "ASC"]],
    limit: pageSize,
    offset: (pageNumber - 1) * pageSize,
  });
  return { sessions, page: pageNumber, limit: pageSize };
};

const listSessionRoster = async (sessionId, { limit = 50, page = 1, search = "" } = {}, user) => {
  const session = await QrAttendanceSession.findByPk(sessionId);
  if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");
  const pageNumber = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 50, 1), 100);
  const scope = getScope(user);
  const memberWhere = {};
  if (scope) {
    // Keep every scoped leader's roster inside the assigned member union.
    // For a multi-team Leader this is a deduplicated read-only union; writes
    // still require a single team context in authorization and the service.
    const scopedWhere = await getMemberScopeWhere(user);
    if (scopedWhere) memberWhere[Op.and] = [scopedWhere];
  }

  if (session.expected_roster_frozen_at && (session.registration_required || session.expected_basis === "explicit_roster")) {
    const expectedMembers = await AttendanceExpectedMember.findAll({
      where: { session_id: session.id },
      attributes: ["member_id"],
      raw: true,
    });
    const expectedIds = expectedMembers.map((row) => Number(row.member_id));
    const scopeClause = memberWhere[Op.and]?.[0];
    if (scopeClause?.id?.[Op.in]) {
      memberWhere[Op.and][0] = { id: { [Op.in]: expectedIds.filter((id) => scopeClause.id[Op.in].includes(id)) } };
    } else {
      memberWhere[Op.and] = [
        ...(memberWhere[Op.and] || []),
        { id: { [Op.in]: expectedIds } },
      ];
    }
  }

  if (search.trim()) {
    const safeSearch = search.trim().slice(0, 80);
    memberWhere[Op.and] = [
      ...(memberWhere[Op.and] || []),
      {
        [Op.or]: [
          { first_name: { [Op.like]: "%" + safeSearch + "%" } },
          { last_name: { [Op.like]: "%" + safeSearch + "%" } },
          { barcode: { [Op.like]: "%" + safeSearch + "%" } },
        ],
      },
    ];
  }

  const result = await Member.findAndCountAll({
    where: memberWhere,
    attributes: ["id", "first_name", "last_name", "status", "cell_group_id", "group_id"],
    order: [["last_name", "ASC"], ["first_name", "ASC"], ["id", "ASC"]],
    limit: pageSize,
    offset: (pageNumber - 1) * pageSize,
  });
  return { members: result.rows, total: result.count, page: pageNumber, limit: pageSize };
};

module.exports = {
  addExplicitExpectedMembers,
  cancelSession,
  closeSession,
  finalizeSession,
  createSession,
  getParent: lookupParent,
  getSession,
  getSessionWithParent,
  listSessionRoster,
  listSessions,
  openSession,
};
