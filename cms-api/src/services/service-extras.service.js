"use strict";

const {
  ServiceAttendanceSummary,
  ServiceResponse,
  SubstituteRequest,
  MinistryAssignment,
  Service,
  Member,
  User,
} = require("../models");

// ── Service Attendance Summary ───────────────────────────────
exports.getSummaryByService = async (serviceId) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw { status: 404, message: "Service not found" };

  const summary = await ServiceAttendanceSummary.findOne({
    where: { service_id: serviceId },
  });
  if (!summary) throw { status: 404, message: "Attendance summary not found" };
  return summary;
};

exports.upsertSummary = async (serviceId, data) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw { status: 404, message: "Service not found" };

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
exports.getResponsesByService = async (serviceId) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw { status: 404, message: "Service not found" };

  return await ServiceResponse.findAll({
    where: { service_id: serviceId },
    include: [
      {
        model: Member,
        attributes: ["id", "first_name", "last_name"],
        required: false,
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
  const service = await Service.findByPk(serviceId);
  if (!service) throw { status: 404, message: "Service not found" };

  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };

  const { attendance_status, seat_number, parking_slot, override_reason } =
    data;

  const existing = await ServiceResponse.findOne({
    where: { service_id: serviceId, member_id: memberId },
  });

  if (existing) {
    await existing.update({
      attendance_status,
      ...(seat_number !== undefined && { seat_number }),
      ...(parking_slot !== undefined && { parking_slot }),
      ...(overrideBy && {
        override_by: overrideBy,
        override_reason: override_reason || null,
      }),
    });
    return existing;
  }

  return await ServiceResponse.create({
    service_id: serviceId,
    member_id: memberId,
    attendance_status,
    seat_number: seat_number || null,
    parking_slot: parking_slot || null,
    override_by: overrideBy || null,
    override_reason: override_reason || null,
  });
};

exports.deleteResponse = async (id) => {
  const response = await ServiceResponse.findByPk(id);
  if (!response) throw { status: 404, message: "Service response not found" };
  await response.destroy();
  return { message: "Service response deleted successfully." };
};

// ── Substitute Requests ──────────────────────────────────────

// Shared includes so Service and proposed Member always appear
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

exports.getAllSubstituteRequests = async () => {
  return await SubstituteRequest.findAll({
    include: substituteIncludes,
    order: [["created_at", "DESC"]],
  });
};

// Get only the requests submitted by the calling user's linked member
exports.getMySubstituteRequests = async (userId) => {
  return await SubstituteRequest.findAll({
    where: { requested_by: userId },
    include: substituteIncludes,
    order: [["created_at", "DESC"]],
  });
};

exports.getSubstituteRequestById = async (id) => {
  const request = await SubstituteRequest.findByPk(id, {
    include: substituteIncludes,
  });
  if (!request) throw { status: 404, message: "Substitute request not found" };
  return request;
};

exports.createSubstituteRequest = async (data, requestedBy) => {
  const { assignment_id, service_id, proposed_member_id, reason } = data;

  let resolvedAssignmentId = assignment_id;

  // If frontend sends service_id instead of assignment_id, look up the assignment
  if (!resolvedAssignmentId && service_id && requestedBy) {
    const user = await User.findByPk(requestedBy, { attributes: ["member_id"] });
    if (user?.member_id) {
      const assignment = await MinistryAssignment.findOne({
        where: { service_id, member_id: user.member_id },
      });
      if (assignment) resolvedAssignmentId = assignment.id;
    }
  }

  if (!resolvedAssignmentId)
    throw { status: 400, message: "Could not find your ministry assignment for this service" };

  const assignment = await MinistryAssignment.findByPk(resolvedAssignmentId);
  if (!assignment) throw { status: 404, message: "Ministry assignment not found" };

  const existing = await SubstituteRequest.findOne({
    where: { assignment_id: resolvedAssignmentId, status: "pending" },
  });
  if (existing)
    throw { status: 409, message: "A pending substitute request already exists for this assignment" };

  // proposed_substitute is a User FK - look up the user linked to the proposed member
  let proposedUserId = null;
  if (proposed_member_id) {
    const proposedUser = await User.findOne({
      where: { member_id: proposed_member_id },
      attributes: ["id"],
    });
    proposedUserId = proposedUser?.id || null;
  }

  return await SubstituteRequest.create({
    assignment_id:       resolvedAssignmentId,
    requested_by:        requestedBy,
    proposed_substitute: proposedUserId,
    reason:              reason || null,
    status:              "pending",
  });
};

exports.resolveSubstituteRequest = async (id, status, resolvedBy) => {
  const request = await SubstituteRequest.findByPk(id, {
    include: [{ model: User, as: "proposedSubstituteUser", attributes: ["id", "member_id"], required: false }],
  });
  if (!request) throw { status: 404, message: "Substitute request not found" };

  if (request.status !== "pending")
    throw { status: 400, message: "Request has already been resolved" };

  if (!["approved", "rejected"].includes(status))
    throw { status: 400, message: "Status must be approved or rejected" };

  // On approval, update the assignment's member to the proposed substitute's linked member
  if (status === "approved" && request.proposed_substitute) {
    const proposedMemberId = request.proposedSubstituteUser?.member_id;
    if (proposedMemberId) {
      await MinistryAssignment.update(
        { member_id: proposedMemberId },
        { where: { id: request.assignment_id } },
      );
    }
  }

  await request.update({ status, resolved_by: resolvedBy });
  return await exports.getSubstituteRequestById(id);
};

exports.deleteSubstituteRequest = async (id) => {
  const request = await SubstituteRequest.findByPk(id);
  if (!request) throw { status: 404, message: "Substitute request not found" };

  if (request.status !== "pending")
    throw { status: 400, message: "Only pending requests can be deleted" };

  await request.destroy();
  return { message: "Substitute request deleted successfully." };
};
