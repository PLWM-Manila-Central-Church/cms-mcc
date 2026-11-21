"use strict";

const { Op } = require("sequelize");
const {
  MinistrySchedule,
  MinistryRole,
  MinistryMembership,
} = require("../models");
const AppError = require("../helpers/AppError");

const KINDS = new Set(["practice", "cleaning", "service"]);
const manilaToday = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });

const serialize = (row) => {
  const value = row && typeof row.get === "function" ? row.get({ plain: true }) : row;
  return {
    id: value.id,
    ministryRoleId: value.ministry_role_id,
    ministry: value.ministryRole ? value.ministryRole.name : null,
    kind: value.kind,
    title: value.title,
    date: String(value.schedule_date).slice(0, 10),
    startTime: value.start_time || null,
    endTime: value.end_time || null,
    location: value.location || null,
    notes: value.notes || null,
  };
};

const includeMinistry = [{ model: MinistryRole, as: "ministryRole", attributes: ["id", "name"], required: false }];

exports.listForMember = async (memberId) => {
  const memberships = await MinistryMembership.findAll({
    where: { member_id: memberId },
    attributes: ["ministry_role_id"],
  });
  const roleIds = memberships.map((row) => row.ministry_role_id);
  if (roleIds.length === 0) return [];

  const rows = await MinistrySchedule.findAll({
    where: { ministry_role_id: { [Op.in]: roleIds }, schedule_date: { [Op.gte]: manilaToday() } },
    include: includeMinistry,
    order: [["schedule_date", "ASC"], ["start_time", "ASC"]],
  });
  return rows.map(serialize);
};

exports.listForMinistry = async (ministryRoleId) => {
  const rows = await MinistrySchedule.findAll({
    where: { ministry_role_id: ministryRoleId },
    include: includeMinistry,
    order: [["schedule_date", "ASC"], ["start_time", "ASC"]],
  });
  return rows.map(serialize);
};

exports.create = async ({ ministryRoleId, kind, title, date, startTime, endTime, location, notes }, userId) => {
  if (!ministryRoleId || !title || !date) {
    throw AppError.badRequest("VALIDATION_ERROR", "Ministry, title and date are required.");
  }
  if (kind && !KINDS.has(kind)) {
    throw AppError.badRequest("VALIDATION_ERROR", "Kind must be practice, cleaning or service.");
  }

  const row = await MinistrySchedule.create({
    ministry_role_id: ministryRoleId,
    kind: kind || "practice",
    title,
    schedule_date: date,
    start_time: startTime || null,
    end_time: endTime || null,
    location: location || null,
    notes: notes || null,
    created_by: userId || null,
  });
  const withMinistry = await MinistrySchedule.findByPk(row.id, { include: includeMinistry });
  return serialize(withMinistry);
};

exports.remove = async (id, userId) => {
  const row = await MinistrySchedule.findByPk(id);
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Schedule entry not found.");
  await row.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: userId || null });
  return { id: Number(id) };
};
