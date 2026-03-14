"use strict";

const { Attendance, Member, Service, User } = require("../models");
const auditLog = require("../helpers/auditLog.helper");

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

// ── Get All Attendance Records ───────────────────────────────
exports.getAllAttendance = async () => {
  return await Attendance.findAll({
    include: attendanceIncludes,
    order: [["checked_in_at", "DESC"]],
  });
};

// ── Get Attendance By ID ─────────────────────────────────────
exports.getAttendanceById = async (id) => {
  const record = await Attendance.findByPk(id, {
    include: attendanceIncludes,
  });
  if (!record) throw { status: 404, message: "Attendance record not found" };
  return record;
};

// ── Create Attendance (Check-in) ─────────────────────────────
exports.createAttendance = async (data, recordedBy) => {
  const { service_id, member_id, check_in_method, checked_in_at } = data;

  const service = await Service.findByPk(service_id);
  if (!service) throw { status: 404, message: "Service not found" };

  if (service.status === "cancelled")
    throw { status: 400, message: "Cannot check in to a cancelled service" };

  const member = await Member.findByPk(member_id);
  if (!member) throw { status: 404, message: "Member not found" };

  // Prevent duplicate check-in
  const existing = await Attendance.findOne({
    where: { service_id, member_id },
  });
  if (existing)
    throw { status: 409, message: "Member already checked in to this service" };

  const record = await Attendance.create({
    service_id,
    member_id,
    check_in_method,
    checked_in_at: checked_in_at || new Date(),
    recorded_by: recordedBy || null,
  });

  const created = await exports.getAttendanceById(record.id);
  auditLog.log({ userId: recordedBy, action: "CHECK_IN", targetTable: "attendances", targetId: created.id, newValues: { service_id, member_id } });
  return created;

// ── Update Attendance ────────────────────────────────────────
exports.updateAttendance = async (id, data) => {
  const record = await Attendance.findByPk(id);
  if (!record) throw { status: 404, message: "Attendance record not found" };

  const { check_in_method, checked_in_at } = data;

  await record.update({
    ...(check_in_method && { check_in_method }),
    ...(checked_in_at && { checked_in_at }),
  });

  return await exports.getAttendanceById(id);
};

// ── Delete Attendance ────────────────────────────────────────
exports.deleteAttendance = async (id) => {
  const record = await Attendance.findByPk(id);
  if (!record) throw { status: 404, message: "Attendance record not found" };

  await record.destroy();
  return { message: "Attendance record deleted successfully." };
};
