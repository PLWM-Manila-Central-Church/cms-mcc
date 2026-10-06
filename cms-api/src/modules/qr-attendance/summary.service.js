"use strict";

const { Op } = require("sequelize");
const AppError = require("../../helpers/AppError");
const { Member, Service } = require("../../models");
const { AttendanceBatch, AttendanceBatchItem, AttendanceExpectedMember, EventAttendance, QrAttendanceSession, QrServiceAttendance } = require("./models");
const { getMemberScopeWhere, getScope } = require("../../helpers/scopedLeader.helper");

const getScopeMemberIds = async (user) => {
  const scope = getScope(user);
  if (!scope) return null;
  if (!scope.id) return [];
  const memberWhere = await getMemberScopeWhere(user);
  const rows = await Member.findAll({ where: memberWhere || {}, attributes: ["id"], raw: true });
  return rows.map((row) => Number(row.id));
};

const getSnapshotScopeQuery = (user, columnSuffix) => {
  const scope = getScope(user);
  if (!scope || scope.type === "ministry") return null;
  if (!scope.id) return { id: { [Op.in]: [] } };
  const field = scope.type === "cell_group" ? "cell_group" : "group";
  return { [field + columnSuffix]: scope.id };
};

const getSessionSummary = async (sessionId, user) => {
  const session = await QrAttendanceSession.findByPk(sessionId);
  if (!session) throw AppError.notFound("ATTENDANCE_SESSION_NOT_FOUND", "Attendance session was not found");

  const scope = getScope(user);
  const scopeMemberIds = await getScopeMemberIds(user);
  const expectedSnapshotWhere = getSnapshotScopeQuery(user, "_id_at_freeze");
  const expectedMemberWhere = scope?.type === "ministry" && scopeMemberIds
    ? { member_id: { [Op.in]: scopeMemberIds } }
    : null;
  const expectedWhere = {
    session_id: session.id,
    ...(expectedSnapshotWhere || {}),
    ...(expectedMemberWhere || {}),
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
      ...(scope?.type === "cell_group" && { cell_group_id: scope.id }),
      ...(scope?.type === "group" && { group_id: scope.id }),
    },
    required: true,
  }];
  if (scope?.type === "cell_group") {
    pendingInclude.push({
      model: Member,
      as: "member",
      attributes: [],
      where: { cell_group_id: scope.id },
      required: true,
    });
  } else if (scope?.type === "group") {
    pendingInclude.push({
      model: Member,
      as: "member",
      attributes: [],
      where: { group_id: scope.id },
      required: true,
    });
  } else if (scope?.type === "ministry") {
    pendingInclude.push({
      model: Member,
      as: "member",
      attributes: [],
      where: { id: { [Op.in]: scopeMemberIds || [] } },
      required: true,
    });
  }

  const pending_members = await AttendanceBatchItem.count({
    where: { outcome: "pending" },
    include: pendingInclude,
    distinct: true,
    col: "member_id",
  });

  const checkInSnapshotWhere = getSnapshotScopeQuery(user, "_id_at_check_in");
  const legacyScopeMemberWhere = scopeMemberIds
    ? { member_id: { [Op.in]: scopeMemberIds } }
    : null;
  const serviceScopeWhere = checkInSnapshotWhere
    ? {
      [Op.or]: [
        checkInSnapshotWhere,
        { [Op.and]: [{ [Object.keys(checkInSnapshotWhere)[0]]: null }, ...(legacyScopeMemberWhere ? [legacyScopeMemberWhere] : [])] },
      ],
    }
    : (legacyScopeMemberWhere || null);
  let confirmed = [];
  if (session.service_id) {
    const filterByCurrentMembership = Boolean(scopeMemberIds && (!checkInSnapshotWhere || scope?.type === "ministry"));
    const memberInclude = {
      model: Member,
      attributes: [],
      required: filterByCurrentMembership,
      ...(filterByCurrentMembership && { where: { id: { [Op.in]: scopeMemberIds } } }),
    };
    confirmed = await QrServiceAttendance.findAll({
      where: {
        service_id: session.service_id,
        check_in_method: { [Op.ne]: "pre-reg" },
        voided_at: null,
        ...(serviceScopeWhere || {}),
      },
      attributes: ["member_id", "cell_group_id_at_check_in", "group_id_at_check_in", "checked_in_at"],
      include: [memberInclude],
      order: [["checked_in_at", "ASC"]],
    });
  } else {
    const filterByCurrentMembership = Boolean(scopeMemberIds && (!checkInSnapshotWhere || scope?.type === "ministry"));
    const memberWhere = filterByCurrentMembership
      ? { id: { [Op.in]: scopeMemberIds } }
      : undefined;
    const attendanceWhere = {
      session_id: session.id,
      voided_at: null,
      ...(checkInSnapshotWhere ? { [Op.or]: [
        checkInSnapshotWhere,
        { [Op.and]: [{ [Object.keys(checkInSnapshotWhere)[0]]: null }, ...(legacyScopeMemberWhere ? [legacyScopeMemberWhere] : [])] },
      ] } : (scope?.type === "ministry" ? { member_id: { [Op.in]: scopeMemberIds } } : (legacyScopeMemberWhere || {}))),
    };
    const memberInclude = {
      model: Member,
      as: "member",
      attributes: [],
      required: Boolean(memberWhere),
      ...(memberWhere && { where: memberWhere }),
    };
    confirmed = await EventAttendance.findAll({
      where: attendanceWhere,
      attributes: ["member_id", "cell_group_id_at_check_in", "group_id_at_check_in", "checked_in_at"],
      include: [memberInclude],
      order: [["checked_in_at", "ASC"]],
    });
  }

  const memberIds = new Set(confirmed.map((record) => Number(record.member_id)));
  const cellGroupMembers = new Map();
  const groupMembers = new Map();
  for (const record of confirmed) {
    const cellGroupId = record.cell_group_id_at_check_in;
    const groupId = record.group_id_at_check_in;
    if (cellGroupId) {
      if (!cellGroupMembers.has(cellGroupId)) cellGroupMembers.set(cellGroupId, new Set());
      cellGroupMembers.get(cellGroupId).add(Number(record.member_id));
    }
    if (groupId) {
      if (!groupMembers.has(groupId)) groupMembers.set(groupId, new Set());
      groupMembers.get(groupId).add(Number(record.member_id));
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

  const registrationCount = session.event_id
    ? await require("../../models").EventRegistration.count({ where: { event_id: session.event_id } })
    : await require("../../models").ServiceResponse.count({
      where: { service_id: session.service_id, attendance_status: "ATTENDING" },
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
    absent_count: !closedForAbsences || expected === null ? null : Math.max(0, expected - checkedExpected),
    registered_count: registrationCount,
    capacity: target?.capacity ?? null,
    pending_members_count: pending_members,
    visits_count: confirmed.length,
    cell_group_counts: cellGroupCounts,
    group_counts: groupCounts,
  };
};

module.exports = { getSessionSummary };
