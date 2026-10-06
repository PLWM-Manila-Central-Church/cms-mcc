"use strict";

const {
  Attendance,
  ServiceAttendanceSummary,
  ServiceResponse,
  SubstituteRequest,
  MinistryAssignment,
  Service,
  Member,
  User,
} = require("../models");
const logger   = require("../helpers/logger");
const AppError = require("../helpers/AppError");
const { syncServiceAttendanceSummary } = require("../helpers/attendanceSummary.helper");

// ── Helpers ──────────────────────────────────────────────────
const syncSummary = async (serviceId) => {
  try {
    await syncServiceAttendanceSummary(serviceId);
  } catch (err) {
    logger.error(err, "syncSummary failed:");
  }
};

// ── Service Attendance Summary ───────────────────────────────
exports.getSummaryByService = async (serviceId) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");

  const summary = await ServiceAttendanceSummary.findOne({
    where: { service_id: serviceId },
  });
  if (!summary) throw AppError.notFound("RECORD_NOT_FOUND", "Attendance summary not found");
  return summary;
};

exports.upsertSummary = async (serviceId, data) => {
  const service = await Service.findByPk(serviceId);
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
exports.getResponsesByService = async (serviceId) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");

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
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");

  const member = await Member.findByPk(memberId);
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

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
  } else {
    await ServiceResponse.create({
      service_id: serviceId,
      member_id: memberId,
      attendance_status,
      seat_number: seat_number || null,
      parking_slot: parking_slot || null,
      override_by: overrideBy || null,
      override_reason: override_reason || null,
    });
  }

  // Sync companion Attendance row + summary
  if (attendance_status === "ATTENDING") {
    const existingAttendance = await Attendance.findOne({
      where: { service_id: serviceId, member_id: memberId },
    });
    if (!existingAttendance) {
      await Attendance.create({
        service_id: serviceId,
        member_id: memberId,
        check_in_method: "pre-reg",
        checked_in_at: new Date(),
        recorded_by: overrideBy || null,
      });
    }
  } else {
    await Attendance.destroy({
      where: { service_id: serviceId, member_id: memberId, check_in_method: "pre-reg" },
    });
  }
  await syncSummary(serviceId);

  return existing || (await ServiceResponse.findOne({
    where: { service_id: serviceId, member_id: memberId },
  }));
};

exports.deleteResponse = async (id) => {
  const response = await ServiceResponse.findByPk(id);
  if (!response) throw AppError.notFound("RECORD_NOT_FOUND", "Service response not found");
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

  if (request.status !== "pending")
    throw AppError.badRequest("VALIDATION", "Request has already been resolved");

  if (!["approved", "rejected"].includes(status))
    throw AppError.badRequest("VALIDATION", "Status must be approved or rejected");

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
  return await exports.getSubstituteRequestById(id, user);
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
