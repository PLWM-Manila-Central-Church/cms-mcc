"use strict";

const { Op } = require("sequelize");
const AppError = require("../helpers/AppError");
const auditLog = require("../helpers/auditLog.helper");
const {
  Service,
  ServiceRecurrenceRule,
  ServiceProgramItem,
  MinistryAssignment,
  MinistryRole,
  Member,
} = require("../models");

const safeFind = (M, opts) => (M?.findAll ? M.findAll(opts).catch(() => []) : Promise.resolve([]));

// ── Recurrence Rules & Upcoming Service Generator
exports.listRecurrenceRules = async () => {
  return safeFind(ServiceRecurrenceRule, { where: { is_deleted: 0 }, order: [["day_of_week", "ASC"], ["start_time", "ASC"]] });
};

exports.createRecurrenceRule = async (payload, user) => {
  const title = String(payload.title || "").trim();
  if (!title) throw AppError.badRequest("VALIDATION_ERROR", "Rule title is required.");
  const dow = Number(payload.day_of_week ?? 0);
  if (dow < 0 || dow > 6) throw AppError.badRequest("VALIDATION_ERROR", "day_of_week must be 0 (Sun) through 6 (Sat).");

  const created = await ServiceRecurrenceRule.create({
    title,
    gathering_type: payload.gathering_type || "lords_day",
    day_of_week: dow,
    start_time: payload.start_time || "09:00:00",
    end_time: payload.end_time || null,
    venue: payload.venue || "Main Sanctuary",
    capacity: payload.capacity || null,
    created_by: user.userId,
  });
  auditLog.log({ userId: user.userId, action: "CREATE_SERVICE_RECURRENCE", targetTable: "service_recurrence_rules", targetId: created.id });
  return created;
};

exports.generateFromRule = async (ruleId, weeks = 4, user) => {
  const rule = await ServiceRecurrenceRule.findOne({ where: { id: ruleId, is_deleted: 0 } });
  if (!rule) throw AppError.notFound("RECORD_NOT_FOUND", "Recurrence rule not found");
  const count = Math.min(12, Math.max(1, parseInt(weeks, 10) || 4));

  const created = [];
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const delta = (Number(rule.day_of_week) - start.getUTCDay() + 7) % 7 || 7;
  start.setUTCDate(start.getUTCDate() + delta);

  for (let i = 0; i < count; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i * 7);
    const serviceDate = d.toISOString().slice(0, 10);

    const existing = await Service.findOne({
      where: { service_date: serviceDate, title: rule.title, is_deleted: 0 },
    });
    if (existing) continue;

    const svc = await Service.create({
      title: rule.title,
      service_date: serviceDate,
      service_time: rule.start_time,
      end_time: rule.end_time,
      venue: rule.venue,
      gathering_type: rule.gathering_type || "lords_day",
      capacity: rule.capacity,
      recurrence_rule_id: rule.id,
      status: "draft",
    });
    created.push(svc);
  }
  auditLog.log({ userId: user.userId, action: "GENERATE_RECURRING_SERVICES", targetTable: "services", targetId: rule.id });
  return { rule_id: rule.id, generated_count: created.length, services: created };
};

// ── Service Program Builder
exports.getServiceProgram = async (serviceId) => {
  return safeFind(ServiceProgramItem, {
    where: { service_id: Number(serviceId), is_deleted: 0 },
    order: [["sort_order", "ASC"], ["start_time", "ASC"], ["id", "ASC"]],
  });
};

exports.addProgramItem = async (serviceId, payload, user) => {
  const title = String(payload.title || "").trim();
  if (!title) throw AppError.badRequest("VALIDATION_ERROR", "Program segment title is required.");
  const allowed = ["worship", "prayer", "scripture", "sermon", "offering", "announcement", "benediction", "other"];
  const created = await ServiceProgramItem.create({
    service_id: Number(serviceId),
    sort_order: Number(payload.sort_order || 0),
    segment_type: allowed.includes(payload.segment_type) ? payload.segment_type : "other",
    title,
    start_time: payload.start_time || null,
    duration_minutes: payload.duration_minutes ? Number(payload.duration_minutes) : null,
    assigned_person: payload.assigned_person || null,
    notes: payload.notes || null,
  });
  auditLog.log({ userId: user.userId, action: "ADD_SERVICE_PROGRAM_ITEM", targetTable: "service_program_items", targetId: created.id });
  return created;
};

exports.archiveProgramItem = async (serviceId, itemId) => {
  const row = await ServiceProgramItem.findOne({ where: { id: itemId, service_id: serviceId, is_deleted: 0 } });
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Program item not found");
  await row.update({ is_deleted: 1 });
  return { id: row.id, archived: true };
};

// ── Servant Assignments & Conflict Detection
exports.getServiceServantsWithConflicts = async (serviceId) => {
  const rows = await safeFind(MinistryAssignment, {
    where: { service_id: Number(serviceId) },
    include: [
      { model: Member, attributes: ["id", "first_name", "last_name", "phone"], required: false },
      { model: MinistryRole, attributes: ["id", "name"], required: false },
    ],
  });

  const plainRows = rows.map((r) => (r.toJSON ? r.toJSON() : r));
  const memberCountMap = new Map();
  for (const r of plainRows) {
    const mid = Number(r.member_id);
    if (!mid) continue;
    memberCountMap.set(mid, (memberCountMap.get(mid) || 0) + 1);
  }

  const enriched = plainRows.map((plain) => ({
    ...plain,
    has_conflict: (memberCountMap.get(Number(plain.member_id)) || 0) > 1,
  }));

  return {
    assignments: enriched,
    conflict_member_ids: [...memberCountMap.entries()].filter(([, cnt]) => cnt > 1).map(([mid]) => mid),
    summary: {
      total: enriched.length,
      confirmed: enriched.filter((x) => x.confirmation_status === "confirmed" || x.confirmed === 1).length,
      pending: enriched.filter((x) => x.confirmation_status === "pending" && !x.confirmed).length,
      declined: enriched.filter((x) => x.confirmation_status === "declined").length,
    },
  };
};

exports.updateServantConfirmation = async (assignmentId, payload) => {
  const status = payload.confirmation_status;
  if (!["pending", "confirmed", "declined", "substituted"].includes(status)) {
    throw AppError.badRequest("VALIDATION_ERROR", "Invalid confirmation status.");
  }
  const row = await MinistryAssignment.findByPk(assignmentId);
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Assignment not found");
  await row.update({
    confirmation_status: status,
    confirmed: status === "confirmed" ? 1 : 0,
    confirmed_at: status === "confirmed" ? new Date() : null,
    decline_reason: status === "declined" ? (payload.decline_reason || null) : null,
    substitute_member_id: payload.substitute_member_id || null,
  });
  return row;
};
