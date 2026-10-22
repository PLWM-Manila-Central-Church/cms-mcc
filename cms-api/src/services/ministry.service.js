"use strict";

const auditLog     = require("../helpers/auditLog.helper");
const logger       = require("../helpers/logger");
const notifService = require("./notifications.service");
const AppError     = require("../helpers/AppError");
const {
  MinistryRole,
  MinistryAssignment,
  MinistryMembership,
  Member,
  CellGroup,
  Group,
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

// ── Get All Ministry Roles (with member_count) ───────────────
exports.getAllRoles = async (leadsMinistryId = null) => {
  const where = leadsMinistryId ? { id: leadsMinistryId, is_deleted: 0 } : { is_deleted: 0 };
  const roles = await MinistryRole.findAll({ where, order: [["name", "ASC"]] });

  // Count from ministry_memberships (roster-added members)
  const rosterCounts = await MinistryMembership.findAll({
    attributes: [
      "ministry_role_id",
      [MinistryMembership.sequelize.fn("COUNT", MinistryMembership.sequelize.col("id")), "cnt"],
    ],
    group: ["ministry_role_id"],
    raw: true,
  });

  const countMap = {};
  rosterCounts.forEach(c => { countMap[c.ministry_role_id] = (countMap[c.ministry_role_id] || 0) + parseInt(c.cnt, 10); });

  return roles.map(r => ({
    ...r.toJSON(),
    member_count: countMap[r.id] || 0,
  }));
};

// ── Get Ministry Role By ID ──────────────────────────────────
exports.getRoleById = async (id, leadsMinistryId = null) => {
  if (leadsMinistryId && parseInt(id, 10) !== parseInt(leadsMinistryId, 10)) {
    throw AppError.forbidden("This ministry is outside your assignment");
  }
  const role = await MinistryRole.findOne({ where: { id, is_deleted: 0 } });
  if (!role) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry role not found");
  return role;
};

// ── Create Ministry Role ─────────────────────────────────────
exports.createRole = async (data, createdBy) => {
  const { name } = data;
  const existing = await MinistryRole.findOne({ where: { name } });
  if (existing)
    throw AppError.conflict("DUPLICATE", "Ministry role name already exists");
  const role = await MinistryRole.create({ name });
  auditLog.log({ userId: createdBy, action: "CREATE_MINISTRY_ROLE", targetTable: "ministry_roles", targetId: role.id });
  return role;
};

// ── Update Ministry Role ─────────────────────────────────────
exports.updateRole = async (id, data, updatedBy) => {
  const role = await MinistryRole.findOne({ where: { id, is_deleted: 0 } });
  if (!role) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry role not found");

  const { name } = data;
  if (name && name !== role.name) {
    const existing = await MinistryRole.findOne({ where: { name } });
    if (existing)
      throw AppError.conflict("DUPLICATE", "Ministry role name already exists");
  }

  await role.update({ ...(name && { name }) });
  auditLog.log({ userId: updatedBy, action: "UPDATE_MINISTRY_ROLE", targetTable: "ministry_roles", targetId: id });
  return role;
};

// ── Archive Ministry Role ────────────────────────────────────
exports.archiveRole = async (id, deletedBy) => {
  const role = await MinistryRole.findOne({ where: { id, is_deleted: 0 } });
  if (!role) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry role not found");

  const inUse = await MinistryAssignment.count({
    where: { ministry_role_id: id },
  });
  if (inUse > 0)
    throw {
      status: 400,
      message: `Reassign or close ${inUse} assignment(s) before archiving this role`,
    };

  // Block if a roster exists under this role
  const rosterCount = await MinistryMembership.count({ where: { ministry_role_id: id } });
  if (rosterCount > 0)
    throw {
      status: 400,
      message: `Remove ${rosterCount} member(s) from this ministry roster before archiving this role.`,
    };

  const activeLeaders = await User.count({ where: { leads_ministry_id: id, is_deleted: 0 } });
  if (activeLeaders > 0) {
    throw {
      status: 400,
      message: `Reassign ${activeLeaders} ministry leader account(s) before archiving this role.`,
    };
  }

  await role.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: deletedBy });
  auditLog.log({ userId: deletedBy, action: "ARCHIVE_MINISTRY_ROLE", targetTable: "ministry_roles", targetId: id });
  return { message: "Ministry role archived successfully." };
};
exports.deleteRole = exports.archiveRole;

// ── Get All Assignments ──────────────────────────────────────
exports.getAllAssignments = async (leadsMinistryId = null) => {
  const where = {};
  if (leadsMinistryId) {
    where.ministry_role_id = leadsMinistryId;
  }
  return await MinistryAssignment.findAll({
    where,
    include: assignmentIncludes,
    order: [["created_at", "DESC"]],
  });
};

// ── Get Assignment By ID ─────────────────────────────────────
exports.getAssignmentById = async (id, leadsMinistryId = null) => {
  const assignment = await MinistryAssignment.findByPk(id, {
    include: assignmentIncludes,
  });
  if (!assignment)
    throw AppError.notFound("RECORD_NOT_FOUND", "Ministry assignment not found");
  if (leadsMinistryId && assignment.ministry_role_id !== leadsMinistryId) {
    throw AppError.forbidden("This assignment is outside your ministry");
  }
  return assignment;
};

// ── Get Assignments By Service ───────────────────────────────
exports.getAssignmentsByService = async (serviceId, leadsMinistryId = null) => {
  const service = await Service.findByPk(serviceId);
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");

  const where = { service_id: serviceId };
  if (leadsMinistryId) where.ministry_role_id = leadsMinistryId;

  return await MinistryAssignment.findAll({
    where,
    include: assignmentIncludes,
    order: [["created_at", "ASC"]],
  });
};

// ── Create Assignment ────────────────────────────────────────
exports.createAssignment = async (data, createdBy, user = {}) => {
  let { service_id, member_id, ministry_role_id } = data;
  if (user.roleName === "Ministry Leader") {
    if (!user.leadsMinistryId) throw AppError.forbidden("No ministry is assigned to your account");
    ministry_role_id = user.leadsMinistryId;
  }

  const service = await Service.findOne({ where: { id: service_id, is_deleted: 0 } });
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");

  const member = await Member.findByPk(member_id);
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  const role = await MinistryRole.findOne({ where: { id: ministry_role_id, is_deleted: 0 } });
  if (!role) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry role not found");

  if (user.roleName === "Ministry Leader") {
    const membership = await MinistryMembership.findOne({
      where: { ministry_role_id, member_id },
    });
    if (!membership) throw AppError.forbidden("You can only assign members in your ministry roster");
  }

  const existing = await MinistryAssignment.unscoped().findOne({
    where: { service_id, member_id },
  });
  if (existing && Number(existing.is_deleted) === 0)
    throw {
      status: 409,
      message: "Member already assigned to this role for this service",
    };

  const assignmentData = {
    service_id,
    member_id,
    ministry_role_id,
    confirmed: 0,
    substitute_requested: 0,
    is_deleted: 0,
    deleted_at: null,
    deleted_by: null,
  };
  const assignment = existing
    ? await existing.update(assignmentData)
    : await MinistryAssignment.create(assignmentData);

  const created = await exports.getAssignmentById(assignment.id, user.leadsMinistryId);
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
    logger.error(err, "Notification failed:")
  }

  return created;
};

// ── Update Assignment ────────────────────────────────────────
exports.updateAssignment = async (id, data, updatedBy, user = {}) => {
  const assignment = await MinistryAssignment.findByPk(id);
  if (!assignment)
    throw AppError.notFound("RECORD_NOT_FOUND", "Ministry assignment not found");
  if (user.roleName === "Ministry Leader") {
    if (!user.leadsMinistryId || assignment.ministry_role_id !== user.leadsMinistryId) {
      throw AppError.forbidden("This assignment is outside your ministry");
    }
    data = { ...data, ministry_role_id: user.leadsMinistryId };
  }

  const { confirmed, substitute_requested, ministry_role_id } = data;

  if (ministry_role_id) {
    const role = await MinistryRole.findByPk(ministry_role_id);
    if (!role) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry role not found");
  }

  await assignment.update({
    ...(ministry_role_id && { ministry_role_id }),
    ...(confirmed !== undefined && { confirmed }),
    ...(substitute_requested !== undefined && { substitute_requested }),
  });

  auditLog.log({ userId: updatedBy, action: "UPDATE_MINISTRY_ASSIGNMENT", targetTable: "ministry_assignments", targetId: id });
  return await exports.getAssignmentById(id, user.leadsMinistryId);
};

// ── Delete Assignment ────────────────────────────────────────
exports.archiveAssignment = async (id, deletedBy, user = {}) => {
  const assignment = await MinistryAssignment.findByPk(id);
  if (!assignment)
    throw AppError.notFound("RECORD_NOT_FOUND", "Ministry assignment not found");
  if (user.roleName === "Ministry Leader" && assignment.ministry_role_id !== user.leadsMinistryId) {
    throw AppError.forbidden("This assignment is outside your ministry");
  }

  await assignment.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: deletedBy });
  auditLog.log({ userId: deletedBy, action: "ARCHIVE_MINISTRY_ASSIGNMENT", targetTable: "ministry_assignments", targetId: id });
  return { message: "Ministry assignment archived and retained in Archives." };
};
exports.deleteAssignment = exports.archiveAssignment;

// ── Ministry Leader: Get Pending Substitutes ───────────────────
exports.getPendingSubstitutes = async (leadsMinistryId) => {
  const SubstituteRequest = require("../models/SubstituteRequest.model");

  return await SubstituteRequest.findAll({
    where: { status: "pending" },
    include: [
      {
        model: MinistryAssignment,
        as: "assignment",
        where: { ministry_role_id: leadsMinistryId },
        required: true,
        include: [
          { model: MinistryRole, as: "ministryRole", attributes: ["id", "name"] },
        ],
      },
      { model: Member, as: "requester", attributes: ["id", "first_name", "last_name"] },
      { model: Service, attributes: ["id", "title", "service_date", "service_time"] },
    ],
    order: [["created_at", "ASC"]],
  });
};

// ── Ministry Leader: Resolve Substitute ───────────────────────
exports.resolveSubstitute = async (id, data, leadsMinistryId, userId) => {
  const serviceExtras = require("./service-extras.service");
  return serviceExtras.resolveSubstituteRequest(id, data?.status, userId, {
    roleName: "Ministry Leader",
    leadsMinistryId,
    userId,
  });
};

// ── Ministry Roster — Search All Members ─────────────────────
exports.searchMembersForRoster = async (search = "") => {
  const { Op } = require("sequelize");
  const where = { is_deleted: 0 };
  const assigned = await MinistryMembership.findAll({
    attributes: ["member_id"],
    raw: true,
  });
  const assignedIds = assigned.map((row) => row.member_id);
  if (assignedIds.length > 0) where.id = { [Op.notIn]: assignedIds };

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
    attributes: ["id", "first_name", "last_name", "email", "phone", "status"],
    include: [
      { model: CellGroup, as: "cellGroup", attributes: ["id", "name"], required: false },
      { model: Group,     as: "group",     attributes: ["id", "name"], required: false },
    ],
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
        attributes: [
          "id", "first_name", "last_name", "email", "phone",
          "birthdate", "spiritual_birthday",
          "profile_photo_url", "status", "cell_group_id", "group_id",
        ],
        required: true,
        include: [
          { model: CellGroup, as: "cellGroup", attributes: ["id", "name"], required: false },
          { model: Group,     as: "group",     attributes: ["id", "name"], required: false },
        ],
      },
    ],
    order: [["created_at", "DESC"]],
  });
};

// ── Ministry Roster — Add Member ─────────────────────────────
exports.addMemberToMinistry = async (ministryRoleId, memberId, addedBy) => {
  const role   = await MinistryRole.findOne({ where: { id: ministryRoleId, is_deleted: 0 } });
  if (!role) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry role not found");

  const member = await Member.findByPk(memberId);
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  const existing = await MinistryMembership.unscoped().findOne({ where: { member_id: memberId } });
  if (existing && Number(existing.is_deleted) === 0) throw AppError.conflict("DUPLICATE", "Member is already assigned to a ministry");

  if (existing) {
    await existing.update({ is_deleted: 0, deleted_at: null, deleted_by: null, ministry_role_id: ministryRoleId, added_by: addedBy });
    return existing;
  }

  return await MinistryMembership.create({
    ministry_role_id: ministryRoleId,
    member_id:        memberId,
    added_by:         addedBy,
  });
};

// ── Ministry Roster — Remove Member ─────────────────────────
exports.archiveMemberFromMinistry = async (ministryRoleId, memberId, deletedBy) => {
  const row = await MinistryMembership.findOne({
    where: { ministry_role_id: ministryRoleId, member_id: memberId },
  });
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Member is not in this ministry roster");
  await row.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: deletedBy });
  auditLog.log({ userId: deletedBy, action: "ARCHIVE_MINISTRY_MEMBERSHIP", targetTable: "ministry_memberships", targetId: row.id });
  return { message: "Ministry membership archived and retained in Archives." };
};
exports.removeMemberFromMinistry = exports.archiveMemberFromMinistry;
