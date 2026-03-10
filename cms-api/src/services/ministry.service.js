"use strict";

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
exports.createRole = async (data) => {
  const { name } = data;
  const existing = await MinistryRole.findOne({ where: { name } });
  if (existing)
    throw { status: 409, message: "Ministry role name already exists" };
  return await MinistryRole.create({ name });
};

// ── Update Ministry Role ─────────────────────────────────────
exports.updateRole = async (id, data) => {
  const role = await MinistryRole.findByPk(id);
  if (!role) throw { status: 404, message: "Ministry role not found" };

  const { name } = data;
  if (name && name !== role.name) {
    const existing = await MinistryRole.findOne({ where: { name } });
    if (existing)
      throw { status: 409, message: "Ministry role name already exists" };
  }

  await role.update({ ...(name && { name }) });
  return role;
};

// ── Delete Ministry Role ─────────────────────────────────────
exports.deleteRole = async (id) => {
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
exports.createAssignment = async (data) => {
  const { service_id, member_id, ministry_role_id } = data;

  const service = await Service.findByPk(service_id);
  if (!service) throw { status: 404, message: "Service not found" };

  const member = await Member.findByPk(member_id);
  if (!member) throw { status: 404, message: "Member not found" };

  const role = await MinistryRole.findByPk(ministry_role_id);
  if (!role) throw { status: 404, message: "Ministry role not found" };

  // Prevent duplicate assignment for same service + member + role
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

  return await exports.getAssignmentById(assignment.id);
};

// ── Update Assignment ────────────────────────────────────────
exports.updateAssignment = async (id, data) => {
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

  return await exports.getAssignmentById(id);
};

// ── Delete Assignment ────────────────────────────────────────
exports.deleteAssignment = async (id) => {
  const assignment = await MinistryAssignment.findByPk(id);
  if (!assignment)
    throw { status: 404, message: "Ministry assignment not found" };

  await assignment.destroy();
  return { message: "Ministry assignment deleted successfully." };
};
