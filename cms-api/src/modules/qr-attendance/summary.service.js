"use strict";

const { Op } = require("sequelize");
const AppError = require("../../helpers/AppError");
const { Member, Service, EventRegistration, ServiceResponse } = require("../../models");
const {
  AttendanceBatch,
  AttendanceBatchItem,
  AttendanceExpectedMember,
  EventAttendance,
  QrAttendanceSession,
  QrServiceAttendance,
} = require("./models");
const { getMemberScopeWhere, getScope } = require("../../helpers/scopedLeader.helper");

const scopeAssignments = (scope = {}) => (scope.assignments || [])
  .filter((assignment) => assignment.id && ["cell_group", "group"].includes(assignment.type));

const getScopeMemberIds = async (user) => {
  const scope = getScope(user);
  if (!scope) return null;
  const memberWhere = await getMemberScopeWhere(user);
  if (!memberWhere) return null;
  const rows = await Member.findAll({ where: memberWhere, attributes: ["id"], raw: true });
  return rows.map((row) => Number(row.id));
};

const getSnapshotScopeQuery = (scope, suffix) => {
  if (!scope || scope.type === "ministry") return null;
  if (["cell_group", "group"].includes(scope.type) && scope.id) {
    return { [`${scope.type === "cell_group" ? "cell_group" : "group"}${suffix}`]: Number(scope.id) };
  }
  if (scope.type === "all") {
    const clauses = scopeAssignments(scope).map((assignment) => ({
      [`${assignment.type === "cell_group" ? "cell_group" : "group"}${suffix}`]: Number(assignment.id),
    }));
    return clauses.length ? { [Op.or]: clauses } : { member_id: { [Op.in]: [] } };
  }
  return { member_id: { [Op.in]: [] } };
};

const getHistoricalScopeWhere = (scope, suffix, memberIds) => {
  if (!scope) return null;
  if (scope.type === "ministry") return { member_id: { [Op.in]: memberIds || [] } };

  const snapshotWhere = getSnapshotScopeQuery(scope, suffix);
  const cellColumn = `cell_group${suffix}`;
  const groupColumn = `group${suffix}`;
  const fallback = {
    [Op.and]: [
      { [cellColumn]: null },
      { [groupColumn]: null },
      { member_id: { [Op.in]: memberIds || [] } },
    ],
  };
  return snapshotWhere ? { [Op.or]: [snapshotWhere, fallback] } : fallback;
};

const getPendingBatchWhere = (scope) => {
  if (!scope) return {};
  if (scope.type === "cell_group" && scope.id) return { cell_group_id: Number(scope.id) };
  if (scope.type === "group" && scope.id) return { group_id: Number(scope.id) };
  if (scope.type === "all") {
    const clauses = scopeAssignments(scope).map((assignment) => assignment.type === "cell_group"
      ? { cell_group_id: Number(assignment.id) }
      : { group_id: Number(assignment.id) });
    return clauses.length ? { [Op.or]: clauses } : { id: { [Op.in]: [] } };
  }
  return { id: { [Op.in]: [] } };
};

const getSessionSummary = async (sessionId, user) => {
  const session = await QrAttendanceSession.findByPk(sessionId);
  if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");

  const scope = getScope(user);
  const scopeMemberIds = await getScopeMemberIds(user);
  const expectedWhere = {
    session_id: session.id,
    ...(scope ? { [Op.and]: [getHistoricalScopeWhere(scope, "_id_at_freeze", scopeMemberIds)] } : {}),
  };
  const expected = session.expected_basis === "none"
    ? null
    : await AttendanceExpectedMember.count({ where: expectedWhere, distinct: true, col: "member_id" });

  const pendingInclude = [{
    model: AttendanceBatch,
    as: "batch",
    attributes: [],
    where: {
      session_id: session.id,
      state: "submitted",
      ...getPendingBatchWhere(scope),
    },
    required: true,
  }];
  const pendingItemRows = await AttendanceBatchItem.findAll({
    where: { outcome: "pending" },
    attributes: ["member_id"],
    include: pendingInclude,
    raw: true,
  });

  const historicalWhere = getHistoricalScopeWhere(scope, "_id_at_check_in", scopeMemberIds);
  let confirmed = [];
  if (session.service_id) {
    confirmed = await QrServiceAttendance.findAll({
      where: {
        service_id: session.service_id,
        check_in_method: { [Op.ne]: "pre-reg" },
        voided_at: null,
        ...(historicalWhere ? { [Op.and]: [historicalWhere] } : {}),
      },
      attributes: ["member_id", "cell_group_id_at_check_in", "group_id_at_check_in", "checked_in_at"],
      order: [["checked_in_at", "ASC"]],
    });
  } else {
    confirmed = await EventAttendance.findAll({
      where: {
        session_id: session.id,
        voided_at: null,
        ...(historicalWhere ? { [Op.and]: [historicalWhere] } : {}),
      },
      attributes: ["member_id", "cell_group_id_at_check_in", "group_id_at_check_in", "checked_in_at"],
      order: [["checked_in_at", "ASC"]],
    });
  }

  const memberIds = new Set(confirmed.map((record) => Number(record.member_id)));
  const submittedMemberIds = new Set(pendingItemRows.map((row) => Number(row.member_id)));
  const pendingMembers = [...submittedMemberIds].filter((memberId) => !memberIds.has(memberId));
  const alreadyConfirmedPending = [...submittedMemberIds].filter((memberId) => memberIds.has(memberId));
  const cellGroupMembers = new Map();
  const groupMembers = new Map();
  for (const record of confirmed) {
    const memberId = Number(record.member_id);
    const cellGroupId = record.cell_group_id_at_check_in;
    const groupId = record.group_id_at_check_in;
    if (cellGroupId) {
      if (!cellGroupMembers.has(cellGroupId)) cellGroupMembers.set(cellGroupId, new Set());
      cellGroupMembers.get(cellGroupId).add(memberId);
    }
    if (groupId) {
      if (!groupMembers.has(groupId)) groupMembers.set(groupId, new Set());
      groupMembers.get(groupId).add(memberId);
    }
  }

  const cellGroupCounts = Object.fromEntries([...cellGroupMembers.entries()].map(([id, ids]) => [id, ids.size]));
  const groupCounts = Object.fromEntries([...groupMembers.entries()].map(([id, ids]) => [id, ids.size]));
  const expectedMemberRows = session.expected_basis === "none"
    ? []
    : await AttendanceExpectedMember.findAll({
      where: expectedWhere,
      attributes: ["member_id"],
      raw: true,
    });
  const expectedIds = new Set(expectedMemberRows.map((row) => Number(row.member_id)));
  const checkedExpected = [...memberIds].filter((memberId) => expectedIds.has(memberId)).length;
  const closedForAbsences = session.status === "closed" || Date.now() > new Date(session.check_in_closes_at).getTime();
  const pendingExpected = pendingMembers.filter((memberId) => expectedIds.has(memberId)).length;
  const isFinalized = Boolean(
    session.finalized_at
    && Number(session.finalized_revision) === Number(session.activity_revision || 1),
  );
  const provisionalMissing = expected === null || !closedForAbsences || isFinalized
    ? null
    : Math.max(0, Number(expected) - checkedExpected - pendingExpected);
  const finalAbsent = expected === null || !isFinalized
    ? null
    : Math.max(0, Number(expected) - checkedExpected);
  const registrationMemberWhere = scope ? { member_id: { [Op.in]: scopeMemberIds || [] } } : {};

  const registrationCount = session.event_id
    ? await EventRegistration.count({ where: { event_id: session.event_id, ...registrationMemberWhere } })
    : await ServiceResponse.count({
      where: { service_id: session.service_id, attendance_status: "ATTENDING", ...registrationMemberWhere },
    });
  const target = session.service_id
    ? await Service.findByPk(session.service_id, { attributes: ["capacity"] })
    : null;

  return {
    session_id: session.id,
    target_type: session.event_id ? "event" : "service",
    confirmed_count: memberIds.size,
    expected_count: expected,
    checked_expected_count: expected === null ? null : checkedExpected,
    absent_count: finalAbsent ?? provisionalMissing,
    provisional_missing_count: provisionalMissing,
    final_absent_count: finalAbsent,
    finalization_status: expected === null ? "unavailable" : isFinalized ? "finalized" : closedForAbsences ? "provisional" : "open",
    finalized_at: isFinalized ? session.finalized_at : null,
    finalized_by: isFinalized ? session.finalized_by : null,
    activity_revision: Number(session.activity_revision || 1),
    registered_count: registrationCount,
    capacity: target?.capacity ?? null,
    pending_members_count: pendingMembers.length,
    already_confirmed_pending_count: alreadyConfirmedPending.length,
    visits_count: confirmed.length,
    cell_group_counts: cellGroupCounts,
    group_counts: groupCounts,
  };
};

module.exports = {
  getHistoricalScopeWhere,
  getPendingBatchWhere,
  getScopeMemberIds,
  getSessionSummary,
  getSnapshotScopeQuery,
};
