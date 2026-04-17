"use strict";

const auditLog = require("../helpers/auditLog.helper");
const {
  MinistryRole,
  MinistryAssignment,
  Member,
  Service,
} = require("../models");

const assignmentIncludes = [
  {
    model: Member,
    attributes: ["id", "first_name", "last_name"],
    required: false,
  },
  {
    model: Service,
    attributes: ["id", "title", "service_date", "service_time"],
    required: false,
  },
  {
    model: MinistryRole,
    as: "ministryRole",
    attributes: ["id", "name"],
    required: false,
  },
];

// ── Get All Ministry Roles ───────────────────────────────────
exports.getAllRoles = async () => {
  return await MinistryRole.findAll({ order: [["name", "ASC"]] });
};

// ── Get Ministry Role By ID ──────────────────────────────────
exports.getRoleById = async (id) => {
  const role = await MinistryRole.findByPk(id);
  if (!role) throw { status: 404, message: "Ministry role not found" };
  return role;
};

// ── Create Ministry Role ─────────────────────────────────────
exports.createRole = async (data, createdBy) => {
  const { name } = data;
  const existing = await MinistryRole.findOne({ where: { name } });
  if (existing)
    throw { status: 409, message: "Ministry role name already exists" };
  const role = await MinistryRole.create({ name });
  auditLog.log({ userId: createdBy, action: "CREATE_MINISTRY_ROLE", targetTable: "ministry_roles", targetId: role.id });
  return role;
};

// ── Update Ministry Role ─────────────────────────────────────
exports.updateRole = async (id, data, updatedBy) => {
  const role = await MinistryRole.findByPk(id);
  if (!role) throw { status: 404, message: "Ministry role not found" };

  const { name } = data;
  if (name && name !== role.name) {
    const existing = await MinistryRole.findOne({ where: { name } });
    if (existing)
      throw { status: 409, message: "Ministry role name already exists" };
  }

  await role.update({ ...(name && { name }) });
  auditLog.log({ userId: updatedBy, action: "UPDATE_MINISTRY_ROLE", targetTable: "ministry_roles", targetId: id });
  return role;
};

// ── Delete Ministry Role ─────────────────────────────────────
exports.deleteRole = async (id, deletedBy) => {
  const role = await MinistryRole.findByPk(id);
  if (!role) throw { status: 404, message: "Ministry role not found" };

  const inUse = await MinistryAssignment.count({
    where: { ministry_role_id: id },
  });
  if (inUse > 0)
    throw {
      status: 400,
      message: `Cannot delete. ${inUse} assignment(s) are using this role`,
    };

  await role.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_MINISTRY_ROLE", targetTable: "ministry_roles", targetId: id });
  return { message: "Ministry role deleted successfully." };
};

// ── Get All Assignments ──────────────────────────────────────
exports.getAllAssignments = async () => {
  return await MinistryAssignment.findAll({
    include: assignmentIncludes,
    order: [["created_at", "DESC"]],
  });
};

// ── Get Assignment By ID ─────────────────────────────────────
exports.getAssignmentById = async (id) => {
  const assignment = await MinistryAssignment.findByPk(id, {
    include: assignmentIncludes,
  });
  if (!assignment)
    throw { status: 404, message: "Ministry assignment not found" };
  return assignment;
};

// ── Get Assignments By Service ───────────────────────────────
exports.getAssignmentsByService = async (serviceId) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw { status: 404, message: "Service not found" };

  return await MinistryAssignment.findAll({
    where: { service_id: serviceId },
    include: assignmentIncludes,
    order: [["created_at", "ASC"]],
  });
};

// ── Create Assignment ────────────────────────────────────────
exports.createAssignment = async (data, createdBy) => {
  const { service_id, member_id, ministry_role_id } = data;

  const service = await Service.findByPk(service_id);
  if (!service) throw { status: 404, message: "Service not found" };

  const member = await Member.findByPk(member_id);
  if (!member) throw { status: 404, message: "Member not found" };

  const role = await MinistryRole.findByPk(ministry_role_id);
  if (!role) throw { status: 404, message: "Ministry role not found" };

  const existing = await MinistryAssignment.findOne({
    where: { service_id, member_id, ministry_role_id },
  });
  if (existing)
    throw {
      status: 409,
      message: "Member already assigned to this role for this service",
    };

  const assignment = await MinistryAssignment.create({
    service_id,
    member_id,
    ministry_role_id,
    confirmed: 0,
    substitute_requested: 0,
  });

  const created = await exports.getAssignmentById(assignment.id);
  auditLog.log({ userId: createdBy, action: "CREATE_MINISTRY_ASSIGNMENT", targetTable: "ministry_assignments", targetId: created.id });
  return created;
};

// ── Update Assignment ────────────────────────────────────────
exports.updateAssignment = async (id, data, updatedBy) => {
  const assignment = await MinistryAssignment.findByPk(id);
  if (!assignment)
    throw { status: 404, message: "Ministry assignment not found" };

  const { confirmed, substitute_requested, ministry_role_id } = data;

  if (ministry_role_id) {
    const role = await MinistryRole.findByPk(ministry_role_id);
    if (!role) throw { status: 404, message: "Ministry role not found" };
  }

  await assignment.update({
    ...(ministry_role_id && { ministry_role_id }),
    ...(confirmed !== undefined && { confirmed }),
    ...(substitute_requested !== undefined && { substitute_requested }),
  });

  auditLog.log({ userId: updatedBy, action: "UPDATE_MINISTRY_ASSIGNMENT", targetTable: "ministry_assignments", targetId: id });
  return await exports.getAssignmentById(id);
};

// ── Delete Assignment ────────────────────────────────────────
exports.deleteAssignment = async (id, deletedBy) => {
  const assignment = await MinistryAssignment.findByPk(id);
  if (!assignment)
    throw { status: 404, message: "Ministry assignment not found" };

  await assignment.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_MINISTRY_ASSIGNMENT", targetTable: "ministry_assignments", targetId: id });
  return { message: "Ministry assignment deleted successfully." };
};

// ── Ministry Leader: Get Pending Substitutes ───────────────────
exports.getPendingSubstitutes = async (ministryRoleId) => {
  const SubstituteRequest = require("../models/SubstituteRequest.model");
  
  return await SubstituteRequest.findAll({
    where: { status: "pending", ministry_role_id: ministryRoleId },
    include: [
      {
        model: Member,
        as: "requester",
        attributes: ["id", "first_name", "last_name"],
      },
      {
        model: Service,
        attributes: ["id", "title", "service_date", "service_time"],
      },
      {
        model: MinistryRole,
        as: "ministryRole",
        attributes: ["id", "name"],
      },
    ],
    order: [["created_at", "ASC"]],
  });
};

// ── Ministry Leader: Resolve Substitute ───────────────────────
exports.resolveSubstitute = async (id, data, ministryRoleId, userId) => {
  const SubstituteRequest = require("../models/SubstituteRequest.model");
  
  const request = await SubstituteRequest.findByPk(id);
  if (!request) throw { status: 404, message: "Substitute request not found" };

  if (request.ministry_role_id !== ministryRoleId) {
    throw { status: 403, message: "This request is not for your ministry" };
  }

  const { status } = data;
  if (!["approved", "rejected"].includes(status)) {
    throw { status: 400, message: "Status must be 'approved' or 'rejected'" };
  }

  await request.update({ status });
  auditLog.log({ userId, action: "RESOLVE_SUBSTITUTE", targetTable: "substitute_requests", targetId: id });
  return request;
};
