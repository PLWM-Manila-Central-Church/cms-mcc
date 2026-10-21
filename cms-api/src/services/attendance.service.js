"use strict";

const { Op } = require("sequelize");
const sequelize = require("../config/db");
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
    where: AttendanceModel === Attendance ? undefined : { voided_at: null },
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

  const service = await Service.findOne({ where: { id: service_id, is_deleted: 0 }, ...(transaction && { transaction }) });
  if (!service) throw AppError.notFound("SERVICE_NOT_FOUND", "Service not found");

  if (service.status === "cancelled")
    throw AppError.badRequest("SERVICE_CANCELLED", "Cannot check in to a cancelled service");

  const member = await Member.findByPk(member_id, transaction && { transaction });
  if (!member) throw AppError.notFound("MEMBER_NOT_FOUND", "Member not found");

  const AttendanceModel = await getAttendanceModel();
  const existing = await AttendanceModel.findOne({
    where: { service_id, member_id },
    ...(transaction && { transaction, lock: transaction.LOCK.UPDATE }),
  });
  if (existing) {
    if (existing.voided_at) {
      if (AttendanceModel === Attendance || existing.entry_source !== "legacy" || check_in_method === "pre-reg") {
        throw AppError.conflict("QR_ATTENDANCE_CORRECTION_REQUIRED", "This archived check-in must be restored through its authorized attendance workflow");
      }
      const before = {
        voided_at: existing.voided_at,
        voided_by: existing.voided_by,
        void_reason: existing.void_reason,
        checked_in_at: existing.checked_in_at,
      };
      const restoredAt = trustedCheckInAt || checked_in_at || new Date();
      await existing.update({
        check_in_method: check_in_method || "manual",
        checked_in_at: restoredAt,
        recorded_by: recordedBy || null,
        voided_at: null,
        voided_by: null,
        void_reason: null,
      }, transaction && { transaction });
      await invalidateServiceFinalization(service_id, {
        transaction,
        actorId: recordedBy,
        reason: "legacy_service_check_in_restored",
      });
      await auditLog.log({
        userId: recordedBy,
        action: "RESTORE_ATTENDANCE",
        targetTable: "attendances",
        targetId: existing.id,
        oldValues: before,
        newValues: { service_id, member_id, checked_in_at: restoredAt },
      }, transaction ? { transaction } : undefined);
      if (transaction && !internal.skipSummary) {
        await syncServiceAttendanceSummary(service_id, transaction);
      } else if (!transaction) {
        try { await syncServiceAttendanceSummary(service_id); } catch (err) {
          logger.error(err, "Failed to sync summary after restoring attendance:");
        }
      }
      const restored = await exports.getAttendanceById(existing.id, user, transaction && { transaction });
      if (idempotent) return { record: restored, created: true };
      return restored;
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
      await auditLog.log({
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

// ── Archive a legacy service check-in ────────────────────────
exports.archiveAttendance = async (id, user = {}, reason) => {
  const normalizedId = Number(id);
  if (!Number.isSafeInteger(normalizedId) || normalizedId <= 0) {
    throw AppError.notFound("ATTENDANCE_NOT_FOUND", "Attendance record not found");
  }
  const archiveReason = String(reason || "Legacy check-in archived by staff correction").trim().slice(0, 500);
  const result = await sequelize.transaction(async (transaction) => {
    const AttendanceModel = await getAttendanceModel();
    if (AttendanceModel === Attendance) {
      throw new AppError(
        "ATTENDANCE_ARCHIVE_SCHEMA_REQUIRED",
        503,
        "Attendance archiving is unavailable until the attendance audit fields are installed.",
      );
    }
    const record = await AttendanceModel.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!record) throw AppError.notFound("ATTENDANCE_NOT_FOUND", "Attendance record not found");
    if (record.entry_source !== "legacy" || record.check_in_method === "pre-reg") {
      throw AppError.conflict("QR_ATTENDANCE_CORRECTION_REQUIRED", "QR and pre-registered attendance must be corrected through their attendance workflow");
    }
    if (record.voided_at) throw AppError.conflict("ATTENDANCE_ALREADY_ARCHIVED", "This check-in is already archived");
    await assertLeaderMayUseLegacyServiceWrite(record.service_id, user, { action: "delete" });
    await ensureMemberInScope(record.member_id, user, { transaction });

    const currentServiceId = record.service_id;
    const before = {
      voided_at: record.voided_at,
      voided_by: record.voided_by,
      void_reason: record.void_reason,
    };
    await record.update({
      voided_at: new Date(),
      voided_by: user.userId || null,
      void_reason: archiveReason,
    }, { transaction });
    await invalidateServiceFinalization(currentServiceId, {
      transaction,
      actorId: user.userId,
      reason: "legacy_service_attendance_archived",
    });
    await syncServiceAttendanceSummary(currentServiceId, transaction);
    await auditLog.log({
      userId: user.userId,
      action: "ARCHIVE_ATTENDANCE",
      targetTable: "attendances",
      targetId: record.id,
      oldValues: before,
      newValues: {
        voided_at: record.voided_at,
        voided_by: record.voided_by,
        void_reason: archiveReason,
        service_id: currentServiceId,
        member_id: record.member_id,
      },
    }, { transaction });
    return { id: record.id, service_id: currentServiceId, member_id: record.member_id };
  });

  cache.keys("dashboard:*").forEach(k => cache.del(k));
  return { message: "Attendance check-in archived successfully.", record: result };
};

exports.archiveAttendanceForService = async (serviceId, memberId, reason, user = {}) => {
  const AttendanceModel = await getAttendanceModel();
  if (AttendanceModel === Attendance) {
    throw new AppError(
      "ATTENDANCE_ARCHIVE_SCHEMA_REQUIRED",
      503,
      "Attendance archiving is unavailable until the attendance audit fields are installed.",
    );
  }
  const record = await AttendanceModel.findOne({
    where: {
      service_id: Number(serviceId),
      member_id: Number(memberId),
      entry_source: "legacy",
      voided_at: null,
      check_in_method: { [Op.ne]: "pre-reg" },
    },
    order: [["checked_in_at", "DESC"], ["id", "DESC"]],
  });
  if (!record) {
    const existing = await AttendanceModel.findOne({
      where: { service_id: Number(serviceId), member_id: Number(memberId) },
      order: [["checked_in_at", "DESC"], ["id", "DESC"]],
    });
    if (existing) {
      throw AppError.conflict("QR_ATTENDANCE_CORRECTION_REQUIRED", "QR, pre-registered, or already archived attendance must be corrected through its attendance workflow");
    }
    throw AppError.notFound("ATTENDANCE_NOT_FOUND", "Attendance record not found");
  }
  return exports.archiveAttendance(record.id, user, reason);
};

// Compatibility alias for older clients. This now archives the legacy check-in.
exports.deleteAttendance = async (id, user = {}) => exports.archiveAttendance(id, user);

exports.deleteAttendanceForService = async (serviceId, memberId, user = {}, reason) =>
  exports.archiveAttendanceForService(serviceId, memberId, reason, user);
