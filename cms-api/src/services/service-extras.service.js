"use strict";

const { Op } = require("sequelize");
const sequelize = require("../config/db");

const {
  Attendance,
  ServiceAttendanceSummary,
  ServiceResponse,
  SubstituteRequest,
  MinistryAssignment,
  MinistryMembership,
  Service,
  Member,
  User,
} = require("../models");
const logger   = require("../helpers/logger");
const AppError = require("../helpers/AppError");
const notifications = require("./notifications.service");
const auditLog = require("../helpers/auditLog.helper");
const { getAttendanceModel, syncServiceAttendanceSummary } = require("../helpers/attendanceSummary.helper");
const { getMemberScopeWhere } = require("../helpers/scopedLeader.helper");
const { saveServiceResponse } = require("../helpers/serviceResponseReservation.helper");

// ── Helpers ──────────────────────────────────────────────────
const syncSummary = async (serviceId) => {
  try {
    await syncServiceAttendanceSummary(serviceId);
  } catch (err) {
    logger.error(err, "syncSummary failed:");
  }
};

// ── Service Attendance Summary ───────────────────────────────
exports.getSummaryByService = async (serviceId, user = {}) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");

  const summary = await ServiceAttendanceSummary.findOne({
    where: { service_id: serviceId },
  });
  if (!summary) throw AppError.notFound("RECORD_NOT_FOUND", "Attendance summary not found");

  const memberScopeWhere = await getMemberScopeWhere(user);
  if (!memberScopeWhere) return summary;

  const AttendanceModel = await getAttendanceModel();
  const totalAttended = await AttendanceModel.count({
    where: {
      service_id: serviceId,
      check_in_method: { [Op.ne]: "pre-reg" },
      ...(AttendanceModel !== Attendance && { voided_at: null }),
    },
    include: [{ model: Member, attributes: [], where: memberScopeWhere, required: true }],
  });

  return {
    ...summary.toJSON(),
    total_expected: Number(service.capacity || 0),
    total_attended: totalAttended,
    total_absent: Math.max(0, Number(service.capacity || 0) - totalAttended),
  };
};

exports.upsertSummary = async (serviceId, data) => {
  const service = await Service.findOne({ where: { id: serviceId, is_deleted: 0 } });
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");

  const { total_expected, total_attended, total_absent } = data;

  const [summary] = await ServiceAttendanceSummary.upsert({
    service_id: serviceId,
    total_expected: total_expected || 0,
    total_attended: total_attended || 0,
    total_absent: total_absent || 0,
  });

  return summary;
};

// ── Service Responses ────────────────────────────────────────
exports.getResponsesByService = async (serviceId, user = {}) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");

  const memberScopeWhere = await getMemberScopeWhere(user);

  return await ServiceResponse.findAll({
    where: { service_id: serviceId },
    include: [
      {
        model: Member,
        attributes: ["id", "first_name", "last_name"],
        required: Boolean(memberScopeWhere),
        ...(memberScopeWhere && { where: memberScopeWhere }),
      },
    ],
    order: [["created_at", "ASC"]],
  });
};

exports.createOrUpdateResponse = async (
  serviceId,
  memberId,
  data,
  overrideBy,
) => {
  const { attendance_status, seat_number, parking_slot, override_reason } =
    data;
  const response = await saveServiceResponse({
    serviceId,
    memberId,
    attendanceStatus: attendance_status,
    seatNumber: seat_number,
    parkingSlot: parking_slot,
    overrideBy,
    overrideReason: override_reason,
  });
  await syncSummary(serviceId);
  return response;
};

exports.deleteResponse = async (id) => {
  const response = await ServiceResponse.findByPk(id);
  if (!response) throw AppError.notFound("RECORD_NOT_FOUND", "Service response not found");
  await response.destroy();
  return { message: "Service response deleted successfully." };
};

// ── Substitute Requests ──────────────────────────────────────

// Shared includes so the service, requester, and proposed replacement always appear.
const substituteIncludes = [
  {
    model: MinistryAssignment,
    as: "assignment",
    required: false,
    include: [
      {
        model: Service,
        attributes: ["id", "title", "service_date", "service_time"],
        required: false,
      },
    ],
  },
  {
    model: User,
    as: "requestedByUser",
    attributes: ["id", "member_id"],
    required: false,
    include: [
      {
        model: Member,
        as: "member",
        attributes: ["id", "first_name", "last_name"],
        required: false,
      },
    ],
  },
  {
    // proposed_substitute is a User FK; include the linked Member via User.member_id
    model: User,
    as: "proposedSubstituteUser",
    attributes: ["id", "member_id"],
    required: false,
    include: [
      {
        model: Member,
        as: "member",
        attributes: ["id", "first_name", "last_name"],
        required: false,
      },
    ],
  },
];

const scopeSubstituteIncludes = (user = {}) => substituteIncludes.map((include) => {
  if (include.as !== "assignment") return include;
  if (user.roleName === "Ministry Leader") {
    return {
      ...include,
      where: { ministry_role_id: user.leadsMinistryId || 0 },
      required: true,
    };
  }
  return include;
});

const ensureSubstituteInScope = (request, user = {}) => {
  if (user.roleName !== "Ministry Leader") return;
  if (request.assignment?.ministry_role_id !== user.leadsMinistryId) {
    throw AppError.forbidden("This substitute request is outside your ministry");
  }
};

exports.getAllSubstituteRequests = async (user = {}) => {
  return await SubstituteRequest.findAll({
    include: scopeSubstituteIncludes(user),
    order: [["created_at", "DESC"]],
  });
};

exports.getEligibleSubstituteServices = async (userId) => {
  const requester = await User.findByPk(userId, {
    attributes: ["id", "member_id", "is_active", "is_deleted"],
  });
  if (!requester || Number(requester.is_active) !== 1 || Number(requester.is_deleted) === 1 || !requester.member_id) {
    return [];
  }

  const assignments = await MinistryAssignment.findAll({
    where: { member_id: requester.member_id },
    attributes: ["id", "service_id"],
    include: [{
      model: Service,
      attributes: ["id", "title", "service_date", "service_time", "status"],
      where: { status: "published" },
      required: true,
    }],
  });
  if (!assignments.length) return [];

  const pendingRequests = await SubstituteRequest.findAll({
    where: {
      assignment_id: { [Op.in]: assignments.map((assignment) => assignment.id) },
      status: "pending",
    },
    attributes: ["assignment_id"],
    raw: true,
  });
  const pendingAssignmentIds = new Set(pendingRequests.map((request) => Number(request.assignment_id)));
  return assignments
    .filter((assignment) => !pendingAssignmentIds.has(Number(assignment.id)))
    .map((assignment) => assignment.Service)
    .filter(Boolean)
    .sort((left, right) => `${left.service_date} ${left.service_time}`.localeCompare(`${right.service_date} ${right.service_time}`));
};

exports.getEligibleSubstituteReplacements = async (serviceIdValue, userId, search = "") => {
  const serviceId = Number(serviceIdValue);
  if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
    throw AppError.badRequest("VALIDATION", "Select a valid service.");
  }
  const requester = await User.findByPk(userId, {
    attributes: ["id", "member_id", "is_active", "is_deleted"],
  });
  if (!requester || Number(requester.is_active) !== 1 || Number(requester.is_deleted) === 1 || !requester.member_id) {
    throw AppError.forbidden("A linked active Member account is required to search for a substitute.");
  }

  const assignment = await MinistryAssignment.findOne({
    where: { service_id: serviceId, member_id: requester.member_id },
    attributes: ["id", "ministry_role_id"],
    include: [{
      model: Service,
      attributes: ["id", "status"],
      where: { status: "published" },
      required: true,
    }],
  });
  if (!assignment) {
    throw AppError.forbidden("You can only search replacements for a published service where you are assigned.");
  }

  const whereMember = { is_deleted: 0 };
  const query = String(search || "").trim();
  if (query) {
    const like = `%${query}%`;
    whereMember[Op.or] = [
      { first_name: { [Op.like]: like } },
      { last_name: { [Op.like]: like } },
    ];
  }
  const roster = await MinistryMembership.findAll({
    where: {
      ministry_role_id: assignment.ministry_role_id,
      member_id: { [Op.ne]: requester.member_id },
    },
    attributes: ["member_id"],
    include: [{
      model: Member,
      as: "member",
      attributes: ["id", "first_name", "last_name"],
      where: whereMember,
      required: true,
      include: [{
        model: User,
        attributes: ["id"],
        where: { is_active: 1, is_deleted: 0 },
        required: true,
      }],
    }],
  });

  return roster
    .map((entry) => entry.member)
    .filter(Boolean)
    .sort((left, right) => `${left.last_name} ${left.first_name}`.localeCompare(`${right.last_name} ${right.first_name}`))
    .slice(0, 10);
};

exports.createSubstituteRequest = async (data, requestedBy) => {
  const serviceId = Number(data?.service_id);
  const reason = String(data?.reason || "").trim();
  if (!Number.isSafeInteger(serviceId) || serviceId <= 0) {
    throw AppError.badRequest("VALIDATION", "Select a valid service.");
  }
  if (reason.length < 5 || reason.length > 500) {
    throw AppError.badRequest("VALIDATION", "Reason must be between 5 and 500 characters.");
  }

  const requester = await User.findByPk(requestedBy, {
    attributes: ["id", "member_id", "is_active", "is_deleted"],
  });
  if (!requester || Number(requester.is_active) !== 1 || Number(requester.is_deleted) === 1 || !requester.member_id) {
    throw AppError.forbidden("A linked active Member account is required to request a substitute.");
  }

  let proposedSubstituteUserId = null;
  let proposedMemberId = null;
  const hasProposedMember = data?.proposed_member_id !== undefined
    && data?.proposed_member_id !== null
    && String(data.proposed_member_id).trim() !== "";
  if (hasProposedMember) {
    proposedMemberId = Number(data.proposed_member_id);
    if (!Number.isSafeInteger(proposedMemberId) || proposedMemberId <= 0) {
      throw AppError.badRequest("VALIDATION", "Select a valid proposed replacement.");
    }
    if (proposedMemberId === Number(requester.member_id)) {
      throw AppError.badRequest("VALIDATION", "You cannot select yourself as the substitute.");
    }
    const proposedUser = await User.findOne({
      where: { member_id: proposedMemberId, is_active: 1, is_deleted: 0 },
      attributes: ["id", "member_id"],
    });
    if (!proposedUser) {
      throw AppError.badRequest("VALIDATION", "The proposed replacement must have an active Member account.");
    }
    proposedSubstituteUserId = proposedUser.id;
  }

  const requestId = await sequelize.transaction(async (transaction) => {
    const assignment = await MinistryAssignment.findOne({
      where: { service_id: serviceId, member_id: requester.member_id },
      include: [{
        model: Service,
        attributes: ["id", "title", "status"],
        where: { status: "published" },
        required: true,
      }],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!assignment) {
      throw AppError.forbidden("You can only request a substitute for a published service where you are assigned.");
    }

    if (proposedMemberId) {
      const proposedMembership = await MinistryMembership.findOne({
        where: { ministry_role_id: assignment.ministry_role_id, member_id: proposedMemberId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!proposedMembership) {
        throw AppError.badRequest("VALIDATION", "The proposed replacement must belong to your ministry roster.");
      }
    }

    const existingRequest = await SubstituteRequest.findOne({
      where: { assignment_id: assignment.id, status: "pending" },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (existingRequest) {
      throw AppError.conflict("SUBSTITUTE_REQUEST_PENDING", "A substitute request is already pending for this service.");
    }

    const request = await SubstituteRequest.create({
      assignment_id: assignment.id,
      requested_by: requester.id,
      proposed_substitute: proposedSubstituteUserId,
      reason,
      status: "pending",
    }, { transaction });
    await assignment.update({ substitute_requested: 1 }, { transaction });
    await auditLog.log({
      userId: requester.id,
      action: "CREATE_SUBSTITUTE_REQUEST",
      targetTable: "substitute_requests",
      targetId: request.id,
    }, { transaction });
    return request.id;
  });

  return await exports.getSubstituteRequestById(requestId, { roleName: "Member", userId: requester.id });
};

// Get only the requests submitted by the calling user's linked member
exports.getMySubstituteRequests = async (userId) => {
  return await SubstituteRequest.findAll({
    where: { requested_by: userId },
    include: substituteIncludes,
    order: [["created_at", "DESC"]],
  });
};

exports.getSubstituteRequestById = async (id, user = {}) => {
  const request = await SubstituteRequest.findByPk(id, {
    include: substituteIncludes,
  });
  if (!request) throw AppError.notFound("RECORD_NOT_FOUND", "Substitute request not found");
  ensureSubstituteInScope(request, user);
  return request;
};

exports.resolveSubstituteRequest = async (id, status, resolvedBy, user = {}) => {
  if (!["approved", "rejected"].includes(status))
    throw AppError.badRequest("VALIDATION", "Status must be approved or rejected");
  const requestId = await sequelize.transaction(async (transaction) => {
    const request = await SubstituteRequest.findByPk(id, {
      include: scopeSubstituteIncludes(user),
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!request) throw AppError.notFound("RECORD_NOT_FOUND", "Substitute request not found");
    ensureSubstituteInScope(request, user);
    if (request.status !== "pending") throw AppError.badRequest("VALIDATION", "Request has already been resolved");

    const assignment = await MinistryAssignment.findByPk(request.assignment_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!assignment) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry assignment not found");
    const assignmentChanges = { substitute_requested: 0 };
    if (status === "approved" && request.proposed_substitute) {
      const proposedMemberId = request.proposedSubstituteUser?.member_id;
      if (proposedMemberId) assignmentChanges.member_id = proposedMemberId;
    }
    await assignment.update(assignmentChanges, { transaction });

    await request.update({ status, resolved_by: resolvedBy }, { transaction });
    await auditLog.log({ userId: resolvedBy, action: `RESOLVE_SUBSTITUTE_${status.toUpperCase()}`, targetTable: "substitute_requests", targetId: id }, { transaction });
    return request.id;
  });
  try {
    await notifications.bulkCreateNotifications(
      await SubstituteRequest.findByPk(requestId, { attributes: ["requested_by", "proposed_substitute"] }).then((request) =>
        [...new Set([request?.requested_by, request?.proposed_substitute].filter(Boolean))]),
      {
        type: `substitute_request_${status}`,
        message: status === "approved" ? "Your substitute request was approved." : "Your substitute request was rejected.",
        reference_id: requestId,
        reference_type: "substitute_request",
      },
    );
  } catch (error) {
    logger.error(error, "Substitute decision notification failed");
  }
  return await exports.getSubstituteRequestById(requestId, user);
};

exports.deleteSubstituteRequest = async (id, user = {}) => {
  const request = await SubstituteRequest.findByPk(id, {
    include: [{ model: MinistryAssignment, as: "assignment", attributes: ["id", "ministry_role_id"], required: true }],
  });
  if (!request) throw AppError.notFound("RECORD_NOT_FOUND", "Substitute request not found");
  ensureSubstituteInScope(request, user);

  if (request.status !== "pending")
    throw AppError.badRequest("VALIDATION", "Only pending requests can be deleted");

  await request.destroy();
  return { message: "Substitute request deleted successfully." };
};
