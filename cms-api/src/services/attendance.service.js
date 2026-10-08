"use strict";

const { Attendance, Member, Service, User } = require("../models");
const cache    = require("../helpers/cache.helper");
const auditLog = require("../helpers/auditLog.helper");
const logger   = require("../helpers/logger");
const notifications = require("./notifications.service");
const AppError = require("../helpers/AppError");
const { getAttendanceModel, syncServiceAttendanceSummary } = require("../helpers/attendanceSummary.helper");
let assertLeaderMayUseLegacyServiceWrite = async () => {};
try {
  ({ assertLeaderMayUseLegacyServiceWrite } = require("../modules/qr-attendance/legacyWriteGuard"));
} catch {
  // The optional QR module must not prevent legacy attendance or login startup.
}
const {
  ensureMemberInScope,
  getMemberScopeWhere,
} = require("../helpers/scopedLeader.helper");
const { invalidateServiceFinalization } = require("../modules/qr-attendance/reconciliation.service");

const attendanceIncludesFor = (user = {}) => [
  {
    model: Member,
    attributes: user.roleName === "Pastor"
      ? ["id", "first_name", "last_name", "status"]
      : ["id", "first_name", "last_name", "barcode"],
    required: false,
  },
  {
    model: Service,
    attributes: ["id", "title", "service_date", "service_time"],
    required: false,
  },
];

// ── Get All Attendance Records ───────────────────────────────
exports.getAllAttendance = async (user = {}) => {
  const AttendanceModel = await getAttendanceModel();
  const memberScopeWhere = await getMemberScopeWhere(user);
  return await AttendanceModel.findAll({
    include: attendanceIncludesFor(user).map((include) => (
      include.model === Member && memberScopeWhere
        ? { ...include, where: memberScopeWhere, required: true }
        : include
    )),
    order: [["checked_in_at", "DESC"]],
  });
};

// ── Get Attendance By ID ─────────────────────────────────────
exports.getAttendanceById = async (id, user = {}, options = {}) => {
  const AttendanceModel = await getAttendanceModel();
  const record = await AttendanceModel.findByPk(id, { include: attendanceIncludesFor(user), ...options });
  if (!record) throw AppError.notFound("ATTENDANCE_NOT_FOUND", "Attendance record not found");
  await ensureMemberInScope(record.member_id, user);
  return record;
};

// ── Create Attendance (Check-in) ─────────────────────────────
exports.createAttendance = async (data, recordedBy, user = {}, options = {}) => {
  const incomingOptions = options || {};
  if (!incomingOptions.transaction) {
    const result = await sequelize.transaction((transaction) => exports.createAttendance(
      data,
      recordedBy,
      user,
      { ...incomingOptions, transaction, skipSummary: true },
    ));
    try { await syncServiceAttendanceSummary(data.service_id); } catch (err) {
      logger.error(err, "Failed to sync summary:");
    }
    if (result?.created !== false) {
      const service = await Service.findByPk(data.service_id, { attributes: ["title"] }).catch(() => null);
      await notifications.notifyAttendanceRecorded({ memberId: data.member_id, activityType: "service", activityId: data.service_id, activityTitle: service?.title });
    }
    cache.keys("dashboard:*").forEach((key) => cache.del(key));
    return result;
  }

  const { service_id, member_id, check_in_method, checked_in_at } = data;
  const internal = incomingOptions;
  const {
    transaction, idempotent, trustedCheckInAt,
  } = internal;
  await assertLeaderMayUseLegacyServiceWrite(service_id, user, {
    approvedBatch: Boolean(internal.approvedBatch),
    qrSessionWrite: Boolean(internal.qrSessionWrite),
    action: "create",
  });
  await ensureMemberInScope(member_id, user);

  const service = await Service.findByPk(service_id, transaction && { transaction });
  if (!service) throw AppError.notFound("SERVICE_NOT_FOUND", "Service not found");

  if (service.status === "cancelled")
    throw AppError.badRequest("SERVICE_CANCELLED", "Cannot check in to a cancelled service");

  const member = await Member.findByPk(member_id, transaction && { transaction });
  if (!member) throw AppError.notFound("MEMBER_NOT_FOUND", "Member not found");

  const existing = await Attendance.findOne({
    where: { service_id, member_id },
    ...(transaction && { transaction, lock: transaction.LOCK.UPDATE }),
  });
  if (existing) {
    if (existing.voided_at) {
      throw AppError.conflict("ATTENDANCE_VOIDED", "This service check-in needs an authorized correction before it can be confirmed again");
    }
    if (existing.check_in_method === "pre-reg") {
      await existing.update({
        check_in_method: check_in_method || "manual",
        checked_in_at: trustedCheckInAt || checked_in_at || new Date(),
        recorded_by: recordedBy || null,
      }, transaction && { transaction });
      await invalidateServiceFinalization(service_id, {
        transaction,
        actorId: recordedBy,
        reason: "legacy_service_check_in_added",
      });
      if (transaction && !internal.skipSummary) {
        await syncServiceAttendanceSummary(service_id, transaction);
      } else if (!transaction) {
        try { await syncServiceAttendanceSummary(service_id); } catch (err) {
          logger.error(err, "Failed to sync summary:");
        }
      }
      const updated = await exports.getAttendanceById(existing.id, user, transaction && { transaction });
      if (idempotent) return { record: updated, created: true };
      return updated;
    }
    if (idempotent) return { record: existing, created: false };
    throw AppError.conflict("ALREADY_CHECKED_IN", "Member already checked in to this service");
  }

  const record = await Attendance.create({
    service_id,
    member_id,
    check_in_method: check_in_method || "manual",
    checked_in_at: trustedCheckInAt || checked_in_at || new Date(),
    recorded_by:   recordedBy || null,
  }, transaction && { transaction });

  await invalidateServiceFinalization(service_id, {
    transaction,
    actorId: recordedBy,
    reason: "legacy_service_check_in_added",
  });

  if (transaction && !internal.skipSummary) {
    await syncServiceAttendanceSummary(service_id, transaction);
  } else if (!transaction) {
    try { await syncServiceAttendanceSummary(service_id); } catch (err) {
      logger.error(err, "Failed to sync summary:");
    }
  }

  const created = await exports.getAttendanceById(record.id, user, transaction && { transaction });
  if (!internal.skipAudit) {
    auditLog.log({
      userId: recordedBy, action: "CHECK_IN",
      targetTable: "attendances", targetId: created.id,
      newValues: { service_id, member_id },
    }, transaction ? { transaction } : undefined);
  }
  if (idempotent) return { record: created, created: true };
  if (!transaction) {
    cache.keys("dashboard:*").forEach(k => cache.del(k));
  }
  return created;
};

// ── Update Attendance ────────────────────────────────────────
exports.updateAttendance = async (id, data, user = {}) => {
  await sequelize.transaction(async (transaction) => {
    const AttendanceModel = await getAttendanceModel();
    const record = await AttendanceModel.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!record) throw AppError.notFound("ATTENDANCE_NOT_FOUND", "Attendance record not found");
    if (AttendanceModel !== Attendance && (record.entry_source !== "legacy" || record.voided_at)) {
      throw AppError.conflict("QR_ATTENDANCE_CORRECTION_REQUIRED", "QR attendance changes must use the audited correction action");
    }
    await assertLeaderMayUseLegacyServiceWrite(record.service_id, user, { action: "update" });
    await ensureMemberInScope(record.member_id, user, { transaction });

    const { check_in_method, checked_in_at } = data;
    await record.update({
      ...(check_in_method && { check_in_method }),
      ...(checked_in_at   && { checked_in_at }),
    }, { transaction });
    await invalidateServiceFinalization(record.service_id, {
      transaction,
      actorId: user.userId,
      reason: "legacy_service_attendance_corrected",
    });
  });

  cache.keys("dashboard:*").forEach((key) => cache.del(key));
  return exports.getAttendanceById(id, user);
};

// ── Delete Attendance ────────────────────────────────────────
exports.deleteAttendance = async (id, user = {}) => {
  const serviceId = await sequelize.transaction(async (transaction) => {
    const AttendanceModel = await getAttendanceModel();
    const record = await AttendanceModel.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!record) throw AppError.notFound("ATTENDANCE_NOT_FOUND", "Attendance record not found");
    if ((AttendanceModel !== Attendance && (record.entry_source !== "legacy" || record.voided_at))
        || record.check_in_method === "pre-reg") {
      throw AppError.conflict("QR_ATTENDANCE_CORRECTION_REQUIRED", "This attendance record cannot be deleted through the legacy Undo action");
    }
    await assertLeaderMayUseLegacyServiceWrite(record.service_id, user, { action: "delete" });
    await ensureMemberInScope(record.member_id, user, { transaction });

    const currentServiceId = record.service_id;
    await record.destroy({ transaction });
    await invalidateServiceFinalization(currentServiceId, {
      transaction,
      actorId: user.userId,
      reason: "legacy_service_attendance_removed",
    });
    return currentServiceId;
  });

  try { await syncServiceAttendanceSummary(serviceId); } catch (err) {
    logger.error(err, "Failed to sync summary on delete:");
  }
  cache.keys("dashboard:*").forEach(k => cache.del(k));
  return { message: "Attendance record deleted successfully." };
};
