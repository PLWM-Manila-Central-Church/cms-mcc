"use strict";

const { Attendance, Member, Service, ServiceAttendanceSummary, User } = require("../models");
const cache    = require("../helpers/cache.helper");
const auditLog = require("../helpers/auditLog.helper");
const logger   = require("../helpers/logger");
const AppError = require("../helpers/AppError");
const {
  ensureMemberInScope,
  getMemberScopeWhere,
} = require("../helpers/scopedLeader.helper");

const attendanceIncludes = [
  {
    model: Member,
    attributes: ["id", "first_name", "last_name", "barcode"],
    required: false,
  },
  {
    model: Service,
    attributes: ["id", "title", "service_date", "service_time"],
    required: false,
  },
];

// ── Helper: recount actual attendance rows and sync the summary table ────────
// Called after every check-in and undo so the summary is always accurate.
const syncSummary = async (serviceId) => {
  const total_attended = await Attendance.count({ where: { service_id: serviceId } });

  const service = await Service.findByPk(serviceId, { attributes: ["capacity"] });
  const total_expected = service?.capacity || 0;
  const total_absent   = Math.max(0, total_expected - total_attended);

  await ServiceAttendanceSummary.upsert({
    service_id:    serviceId,
    total_attended,
    total_expected,
    total_absent,
  });
};

// ── Get All Attendance Records ───────────────────────────────
exports.getAllAttendance = async (user = {}) => {
  const memberScopeWhere = await getMemberScopeWhere(user);
  return await Attendance.findAll({
    include: attendanceIncludes.map((include) => (
      include.model === Member && memberScopeWhere
        ? { ...include, where: memberScopeWhere, required: true }
        : include
    )),
    order: [["checked_in_at", "DESC"]],
  });
};

// ── Get Attendance By ID ─────────────────────────────────────
exports.getAttendanceById = async (id, user = {}) => {
  const record = await Attendance.findByPk(id, { include: attendanceIncludes });
  if (!record) throw AppError.notFound("ATTENDANCE_NOT_FOUND", "Attendance record not found");
  await ensureMemberInScope(record.member_id, user);
  return record;
};

// ── Create Attendance (Check-in) ─────────────────────────────
exports.createAttendance = async (data, recordedBy, user = {}) => {
  const { service_id, member_id, check_in_method, checked_in_at } = data;
  await ensureMemberInScope(member_id, user);

  const service = await Service.findByPk(service_id);
  if (!service) throw AppError.notFound("SERVICE_NOT_FOUND", "Service not found");

  if (service.status === "cancelled")
    throw AppError.badRequest("SERVICE_CANCELLED", "Cannot check in to a cancelled service");

  const member = await Member.findByPk(member_id);
  if (!member) throw AppError.notFound("MEMBER_NOT_FOUND", "Member not found");

  const existing = await Attendance.findOne({ where: { service_id, member_id } });
  if (existing) {
    // Allow converting a pre-reg record to manual check-in (member physically arrived)
    if (existing.check_in_method === "pre-reg") {
      await existing.update({ check_in_method: "manual", recorded_by: recordedBy || null });
      await syncSummary(service_id);
      return await exports.getAttendanceById(existing.id, user);
    }
    throw AppError.conflict("ALREADY_CHECKED_IN", "Member already checked in to this service");
  }

  const record = await Attendance.create({
    service_id,
    member_id,
    check_in_method: check_in_method || "manual",
    checked_in_at: checked_in_at || new Date(),
    recorded_by:   recordedBy || null,
  });

  // FIX BUG 2: sync summary so attendance bars reflect real data
  try { await syncSummary(service_id); } catch (err) {
    logger.error(err, "Failed to sync summary:")
  }

  const created = await exports.getAttendanceById(record.id, user);
  auditLog.log({
      userId: recordedBy, action: "CHECK_IN",
      targetTable: "attendances", targetId: created.id,
      newValues: { service_id, member_id },
    });
    cache.keys("dashboard:*").forEach(k => cache.del(k));
    return created;
};

// ── Update Attendance ────────────────────────────────────────
exports.updateAttendance = async (id, data, user = {}) => {
  const record = await Attendance.findByPk(id);
  if (!record) throw AppError.notFound("ATTENDANCE_NOT_FOUND", "Attendance record not found");
  await ensureMemberInScope(record.member_id, user);

  const { check_in_method, checked_in_at } = data;
  await record.update({
    ...(check_in_method && { check_in_method }),
    ...(checked_in_at   && { checked_in_at }),
  });

  return await exports.getAttendanceById(id, user);
};

// ── Delete Attendance ────────────────────────────────────────
exports.deleteAttendance = async (id, user = {}) => {
  const record = await Attendance.findByPk(id);
  if (!record) throw AppError.notFound("ATTENDANCE_NOT_FOUND", "Attendance record not found");
  await ensureMemberInScope(record.member_id, user);

  const serviceId = record.service_id;
  await record.destroy();

  // FIX BUG 2: sync summary after undo so the count decrements correctly
    try { await syncSummary(serviceId); } catch (err) {
      logger.error(err, "Failed to sync summary on delete:")
    }

    cache.keys("dashboard:*").forEach(k => cache.del(k));
    return { message: "Attendance record deleted successfully." };
};
