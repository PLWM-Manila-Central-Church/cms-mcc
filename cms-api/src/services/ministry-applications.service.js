"use strict";

const { Op } = require("sequelize");
const sequelize = require("../config/db");
const auditLog = require("../helpers/auditLog.helper");
const AppError = require("../helpers/AppError");
const logger = require("../helpers/logger");
const notifications = require("./notifications.service");
const {
  Member,
  MinistryRole,
  MinistryMembership,
  MinistryApplication,
  Role,
  User,
} = require("../models");

const applicationKey = (memberId, ministryRoleId) => `member:${memberId}:ministry:${ministryRoleId}`;

const roleUserIds = async (roleNames, ministryRoleId) => {
  const roles = await Role.findAll({ where: { role_name: { [Op.in]: roleNames } }, attributes: ["id", "role_name"] });
  if (!roles.length) return [];
  const ministryLeaderRole = roles.find((role) => role.role_name === "Ministry Leader");
  const systemAdminRole = roles.find((role) => role.role_name === "System Admin");
  const reviewerScopes = [];
  if (systemAdminRole) reviewerScopes.push({ role_id: systemAdminRole.id });
  if (ministryLeaderRole) reviewerScopes.push({ role_id: ministryLeaderRole.id, leads_ministry_id: ministryRoleId });
  const users = await User.findAll({
    where: {
      [Op.or]: reviewerScopes,
      is_active: 1,
      is_deleted: 0,
    },
    attributes: ["id"],
  });
  return users.map((user) => user.id);
};

const notifyUsers = async (userIds, payload) => {
  try { await notifications.bulkCreateNotifications(userIds, payload); }
  catch (error) { logger.error(error, "Ministry application notification failed"); }
};

const applicationIncludes = [
  { model: Member, as: "member", attributes: ["id", "first_name", "last_name", "member_id"], required: true },
  { model: MinistryRole, as: "ministryRole", attributes: ["id", "name"], required: true },
];

exports.getOpportunities = async (memberId) => {
  if (!memberId) throw AppError.badRequest("MEMBER_PROFILE_REQUIRED", "A member profile is required to apply to a ministry");
  const member = await Member.findByPk(memberId, { attributes: ["id", "status"] });
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member profile not found");
  if (member.status !== "Active") throw AppError.forbidden("Only active members can apply to a ministry");

  const [roles, memberships, applications] = await Promise.all([
    MinistryRole.findAll({ order: [["name", "ASC"]] }),
    MinistryMembership.findAll({ where: { member_id: memberId }, attributes: ["ministry_role_id"] }),
    MinistryApplication.findAll({ where: { member_id: memberId }, attributes: ["id", "ministry_role_id", "status", "message", "review_note", "created_at", "reviewed_at"] }),
  ]);
  const membershipRoleIds = new Set(memberships.map((row) => Number(row.ministry_role_id)));
  const latestByRole = new Map();
  for (const application of applications) {
    const key = Number(application.ministry_role_id);
    const previous = latestByRole.get(key);
    if (!previous || new Date(application.created_at) > new Date(previous.created_at)) latestByRole.set(key, application);
  }
  return roles.map((role) => ({
    ...role.toJSON(),
    is_member: membershipRoleIds.has(Number(role.id)),
    application: latestByRole.get(Number(role.id))?.toJSON?.() || null,
  }));
};

exports.getMyApplications = async (memberId) => {
  if (!memberId) throw AppError.badRequest("MEMBER_PROFILE_REQUIRED", "A member profile is required to view ministry applications");
  return MinistryApplication.findAll({
    where: { member_id: memberId },
    include: [{ model: MinistryRole, as: "ministryRole", attributes: ["id", "name"], required: true }],
    order: [["created_at", "DESC"]],
  });
};

exports.createApplication = async ({ memberId, ministryRoleId, message, userId }) => {
  if (!memberId) throw AppError.badRequest("MEMBER_PROFILE_REQUIRED", "A member profile is required to apply to a ministry");
  const [member, ministryRole] = await Promise.all([
    Member.findByPk(memberId, { attributes: ["id", "status"] }),
    MinistryRole.findByPk(ministryRoleId),
  ]);
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member profile not found");
  if (member.status !== "Active") throw AppError.forbidden("Only active members can apply to a ministry");
  if (!ministryRole) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry role not found");

  let application;
  try {
    application = await sequelize.transaction(async (transaction) => {
      const existingMembership = await MinistryMembership.findOne({
        where: { member_id: memberId, ministry_role_id: ministryRoleId },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existingMembership) throw AppError.conflict("ALREADY_A_MEMBER", "You already belong to this ministry");

      const existingApplication = await MinistryApplication.findOne({
        where: { member_id: memberId, ministry_role_id: ministryRoleId, status: "pending" },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (existingApplication) throw AppError.conflict("APPLICATION_PENDING", "You already have a pending application for this ministry");

      const created = await MinistryApplication.create({
        application_key: applicationKey(memberId, ministryRoleId),
        member_id: memberId,
        ministry_role_id: ministryRoleId,
        status: "pending",
        message: message || null,
      }, { transaction });
      auditLog.log({ userId, action: "CREATE_MINISTRY_APPLICATION", targetTable: "ministry_applications", targetId: created.id }, { transaction });
      return created;
    });
  } catch (error) {
    if (error?.name === "SequelizeUniqueConstraintError") {
      throw AppError.conflict("APPLICATION_PENDING", "You already have a pending application for this ministry");
    }
    throw error;
  }

  const reviewerIds = await roleUserIds(["System Admin", "Ministry Leader"], ministryRoleId);
  await notifyUsers(reviewerIds, {
    type: "ministry_application_submitted",
    message: `A member applied to join ${ministryRole.name}.`,
    reference_id: application.id,
    reference_type: "ministry_application",
  });
  return exports.getApplicationById(application.id);
};

exports.getApplicationById = async (id, transaction) => {
  const application = await MinistryApplication.findByPk(id, { include: applicationIncludes, transaction });
  if (!application) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry application not found");
  return application;
};

exports.listApplications = async ({ user, status = "pending", page = 1, limit = 25 } = {}) => {
  const where = {};
  if (status) where.status = status;
  if (user?.roleName === "Ministry Leader") {
    if (!user.leadsMinistryId) throw AppError.forbidden("This account has no ministry assignment");
    where.ministry_role_id = user.leadsMinistryId;
  } else if (user?.roleName !== "System Admin") {
    throw AppError.forbidden("Only administrators and assigned ministry leaders can review applications");
  }
  const offset = (Number(page) - 1) * Number(limit);
  const { count, rows } = await MinistryApplication.findAndCountAll({
    where,
    include: applicationIncludes,
    order: [["created_at", "ASC"]],
    limit: Number(limit),
    offset,
    distinct: true,
  });
  return { applications: rows, total: count, page: Number(page), limit: Number(limit), total_pages: Math.ceil(count / Number(limit)) };
};

exports.withdrawApplication = async (id, memberId, userId) => {
  const application = await MinistryApplication.findOne({ where: { id, member_id: memberId, status: "pending" } });
  if (!application) throw AppError.notFound("PENDING_APPLICATION_NOT_FOUND", "Pending application not found");
  await sequelize.transaction(async (transaction) => {
    await application.update({ status: "withdrawn", application_key: null }, { transaction });
    auditLog.log({ userId, action: "WITHDRAW_MINISTRY_APPLICATION", targetTable: "ministry_applications", targetId: id }, { transaction });
  });
  return exports.getApplicationById(id);
};

exports.reviewApplication = async (id, { status, review_note }, user = {}) => {
  if (!(["approved", "rejected"].includes(status))) throw AppError.badRequest("VALIDATION", "Choose approved or rejected");
  if (status === "rejected" && String(review_note || "").trim().length < 5) {
    throw AppError.badRequest("REVIEW_NOTE_REQUIRED", "Enter a reason of at least 5 characters when rejecting an application");
  }

  const result = await sequelize.transaction(async (transaction) => {
    const application = await MinistryApplication.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!application || application.status !== "pending") throw AppError.conflict("APPLICATION_NOT_PENDING", "Only pending applications can be reviewed");
    if (user.roleName === "Ministry Leader" && Number(user.leadsMinistryId) !== Number(application.ministry_role_id)) {
      throw AppError.forbidden("This application is outside your ministry");
    }
    if (user.roleName !== "System Admin" && user.roleName !== "Ministry Leader") {
      throw AppError.forbidden("Only administrators and ministry leaders can review applications");
    }

    if (status === "approved") {
      const existingMembership = await MinistryMembership.findOne({
        where: { member_id: application.member_id, ministry_role_id: application.ministry_role_id },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!existingMembership) {
        await MinistryMembership.create({ member_id: application.member_id, ministry_role_id: application.ministry_role_id, added_by: user.userId }, { transaction });
      }
    }
    await application.update({
      status,
      application_key: null,
      review_note: review_note || null,
      reviewed_by: user.userId,
      reviewed_at: new Date(),
    }, { transaction });
    auditLog.log({ userId: user.userId, action: `MINISTRY_APPLICATION_${status.toUpperCase()}`, targetTable: "ministry_applications", targetId: id }, { transaction });
    return application;
  });

  const applicant = await User.findOne({ where: { member_id: result.member_id, is_active: 1 }, attributes: ["id"] });
  if (applicant) {
    await notifyUsers([applicant.id], {
      type: `ministry_application_${status}`,
      message: status === "approved" ? "Your ministry application was approved." : "Your ministry application was not approved.",
      reference_id: result.id,
      reference_type: "ministry_application",
    });
  }
  return exports.getApplicationById(id);
};
