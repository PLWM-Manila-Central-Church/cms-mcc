"use strict";

const auditLog     = require("../helpers/auditLog.helper");
const notifService = require("./notifications.service");
const {
  MinistryRole,
  MinistryAssignment,
  MinistryMembership,
  Member,
  Service,
  User,
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

  // Block if any user is tagged with this role as their ministry sub-role
  const taggedUsers = await User.count({ where: { ministry_role_id: id } });
  if (taggedUsers > 0)
    throw {
      status: 400,
      message: `Cannot delete. ${taggedUsers} user(s) are tagged with this ministry role.`,
    };

  // Block if a roster exists under this role
  const rosterCount = await MinistryMembership.count({ where: { ministry_role_id: id } });
  if (rosterCount > 0)
    throw {
      status: 400,
      message: `Cannot delete. ${rosterCount} member(s) are in this ministry's roster.`,
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

  try {
    const userRecord = await User.findOne({
      where: { member_id, is_active: 1 }, attributes: ["id"],
    });
    if (userRecord) {
      const serviceTitle = created.Service?.title       || "an upcoming service";
      const serviceDate  = created.Service?.service_date || "";
      const roleName     = created.ministryRole?.name   || "a ministry role";
      await notifService.createNotification({
        user_id:        userRecord.id,
        type:           "ministry_assigned",
        message:        `You have been assigned as ${roleName} for "${serviceTitle}"${serviceDate ? ` on ${serviceDate}` : ""}. Please confirm your assignment in your portal.`,
        reference_id:   service_id,
        reference_type: "service",
      });
    }
  } catch (err) {
    console.error("[Ministry] Notification failed:", err.message);
  }

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

// ── Ministry Roster — Search All Members (unscoped, for roster add) ──
exports.searchMembersForRoster = async (search = "") => {
  const { Op } = require("sequelize");
  const where = { is_deleted: 0 };
  if (search.trim()) {
    const like = `%${search.trim()}%`;
    where[Op.or] = [
      { first_name: { [Op.like]: like } },
      { last_name:  { [Op.like]: like } },
      { email:      { [Op.like]: like } },
    ];
  }
  return await Member.findAll({
    where,
    attributes: ["id", "first_name", "last_name", "email", "status"],
    order: [["last_name", "ASC"], ["first_name", "ASC"]],
    limit: 10,
  });
};
exports.getMyMinistryMembers = async (ministryRoleId) => {
  return await MinistryMembership.findAll({
    where: { ministry_role_id: ministryRoleId },
    include: [
      {
        model: Member,
        as: "member",
        attributes: ["id", "first_name", "last_name", "email", "phone",
                     "profile_photo_url", "status", "cell_group_id", "group_id"],
        required: true,
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

// ── Ministry Roster — Add Member ─────────────────────────────
exports.addMemberToMinistry = async (ministryRoleId, memberId, addedBy) => {
  const role   = await MinistryRole.findByPk(ministryRoleId);
  if (!role) throw { status: 404, message: "Ministry role not found" };

  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };

  const existing = await MinistryMembership.findOne({
    where: { ministry_role_id: ministryRoleId, member_id: memberId },
  });
  if (existing) throw { status: 409, message: "Member is already in this ministry roster" };

  return await MinistryMembership.create({
    ministry_role_id: ministryRoleId,
    member_id:        memberId,
    added_by:         addedBy,
  });
};

// ── Ministry Roster — Remove Member ─────────────────────────
exports.removeMemberFromMinistry = async (ministryRoleId, memberId) => {
  const row = await MinistryMembership.findOne({
    where: { ministry_role_id: ministryRoleId, member_id: memberId },
  });
  if (!row) throw { status: 404, message: "Member is not in this ministry roster" };
  await row.destroy();
  return { message: "Member removed from ministry roster." };
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
exports.resolveSubstitute = async (id, data, userId) => {
  const SubstituteRequest = require("../models/SubstituteRequest.model");
  
  const request = await SubstituteRequest.findByPk(id);
  if (!request) throw { status: 404, message: "Substitute request not found" };

  const { status } = data;
  if (!["approved", "rejected"].includes(status)) {
    throw { status: 400, message: "Status must be 'approved' or 'rejected'" };
  }

  await request.update({ status });
  auditLog.log({ userId, action: "RESOLVE_SUBSTITUTE", targetTable: "substitute_requests", targetId: id });
  return request;
};
