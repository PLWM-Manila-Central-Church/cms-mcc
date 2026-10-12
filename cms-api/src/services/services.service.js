"use strict";

const { Op }       = require("sequelize");
const sequelize    = require("../config/db");
const auditLog     = require("../helpers/auditLog.helper");
const logger       = require("../helpers/logger");
const notifService = require("./notifications.service");
const { Service, ServiceAttendanceSummary, ServiceResponse, Attendance, User } = require("../models");
const { syncServiceAttendanceSummary } = require("../helpers/attendanceSummary.helper");
const { isScopedLeader } = require("../helpers/scopedLeader.helper");
const AppError = require("../helpers/AppError");

const SERVICE_STATUS_FLOW = Object.freeze({
  draft: ["published", "cancelled"],
  published: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
});

const ensureStatusTransition = (current, next) => {
  if (current !== next && !SERVICE_STATUS_FLOW[current]?.includes(next)) {
    throw AppError.badRequest("INVALID_STATUS_TRANSITION", `Cannot change service status from '${current}' to '${next}'`);
  }
};

// ── Get All Services (paginated) ─────────────────────────────
exports.getAllServices = async ({ page = 1, limit = 15, status } = {}, user = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = {};
  const hideChurchwideAttendance = isScopedLeader(user);
  if (status) where.status = status;

  const { count, rows } = await Service.findAndCountAll({
    where,
    include: hideChurchwideAttendance ? [] : [
      {
        model: ServiceAttendanceSummary,
        as: "summary",
        required: false,
      },
    ],
    order: [["service_date", "DESC"], ["service_time", "DESC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  // Fetch ATTENDING pre-registration counts for all services in this page
  const serviceIds = rows.map((r) => r.id);
  const preRegCounts = {};
  if (serviceIds.length > 0 && !hideChurchwideAttendance) {
    const { Op } = require("sequelize");
    const preRegs = await ServiceResponse.findAll({
      where: {
        service_id: { [Op.in]: serviceIds },
        attendance_status: "ATTENDING",
      },
      attributes: ["service_id"],
    });
    preRegs.forEach((pr) => {
      preRegCounts[pr.service_id] = (preRegCounts[pr.service_id] || 0) + 1;
    });
  }

  // Remap alias "summary" → "ServiceAttendanceSummary" and attach pre_registered_count
  const services = rows.map((row) => {
    const plain = row.toJSON();
    // Leaders may browse church service details, but a churchwide summary would
    // reveal attendance outside their assigned scope. Service detail routes
    // return member-scoped attendance and their own scoped summary.
    plain.summary = hideChurchwideAttendance ? null : plain.summary || null;
    plain.ServiceAttendanceSummary = plain.summary;
    // pre_registered_count = ATTENDING responses; used when actual check-ins = 0
    plain.pre_registered_count = hideChurchwideAttendance ? 0 : preRegCounts[plain.id] || 0;
    return plain;
  });

  return {
    services,
    total: count,
    total_pages: Math.ceil(count / parseInt(limit)),
  };
};

// ── Get Service By ID ────────────────────────────────────────
exports.getServiceById = async (id) => {
  const service = await Service.findByPk(id);
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");
  return service;
};

// ── Create Service ───────────────────────────────────────────
exports.createService = async (data, createdBy) => {
  const {
    title,
    service_date,
    service_time,
    capacity,
    total_parking_slots,
    response_deadline,
    status,
  } = data;

  const service = await Service.create({
    title,
    service_date,
    service_time,
    capacity,
    total_parking_slots,
    response_deadline: response_deadline || null,
    status: status || "draft",
  });

  auditLog.log({ userId: createdBy, action: "CREATE_SERVICE", targetTable: "services", targetId: service.id });
  return service;
};

// ── Update Service ───────────────────────────────────────────
exports.updateService = async (id, data, updatedBy) => {
  const {
    title,
    service_date,
    service_time,
    capacity,
    total_parking_slots,
    response_deadline,
    status,
  } = data;
  const service = await sequelize.transaction(async (transaction) => {
    const lockedService = await Service.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!lockedService) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");
    if (lockedService.status === "completed" || lockedService.status === "cancelled") {
      throw AppError.badRequest("VALIDATION", "Cannot update a completed or cancelled service");
    }

    if (status !== undefined) ensureStatusTransition(lockedService.status, status);

    const nextCapacity = capacity === undefined ? Number(lockedService.capacity) : Number(capacity);
    const nextParkingLimit = total_parking_slots === undefined
      ? Number(lockedService.total_parking_slots)
      : Number(total_parking_slots);
    if (capacity !== undefined || total_parking_slots !== undefined) {
      const reservations = await ServiceResponse.findAll({
        where: { service_id: id, attendance_status: "ATTENDING" },
        attributes: ["seat_number", "parking_slot"],
        transaction,
      });
      if (reservations.length > nextCapacity) {
        throw AppError.conflict("CAPACITY_BELOW_CURRENT_RSVPS", `Capacity cannot be less than the ${reservations.length} current attending RSVPs`);
      }
      const invalidSeat = reservations.some((row) => {
        if (!row.seat_number) return false;
        const value = Number(row.seat_number);
        return !Number.isSafeInteger(value) || value < 1 || value > nextCapacity;
      });
      if (invalidSeat) {
        throw AppError.conflict("CAPACITY_BELOW_RESERVED_SEAT", "Capacity cannot be reduced below an already reserved seat number");
      }
      const invalidParking = reservations.some((row) => {
        if (!row.parking_slot) return false;
        const value = Number(row.parking_slot);
        return !Number.isSafeInteger(value) || value < 1 || value > nextParkingLimit;
      });
      if (invalidParking) {
        throw AppError.conflict("PARKING_LIMIT_BELOW_RESERVED_SLOT", "Parking slots cannot be reduced below an already reserved slot number");
      }
    }

    await lockedService.update({
      ...(title               && { title }),
      ...(service_date        && { service_date }),
      // Coerce empty strings to null so clearing these fields stores NULL.
      ...(service_time        !== undefined && { service_time: service_time || null }),
      ...(capacity            !== undefined && { capacity }),
      ...(total_parking_slots !== undefined && { total_parking_slots }),
      ...(response_deadline   !== undefined && { response_deadline: response_deadline || null }),
      ...(status              && { status }),
    }, { transaction });
    return lockedService;
  });

  // Re-sync summary if capacity changed
  if (capacity !== undefined) {
    try { await syncServiceAttendanceSummary(id); } catch (err) {
      logger.error(err, "Failed to sync summary after capacity change:");
    }
  }

  auditLog.log({ userId: updatedBy, action: "UPDATE_SERVICE", targetTable: "services", targetId: id });
  return service;
};

// ── Delete Service ───────────────────────────────────────────
exports.deleteService = async (id, deletedBy) => {
  const service = await Service.findByPk(id);
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");
  // Completed services can be deleted (admin request)
  await service.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_SERVICE", targetTable: "services", targetId: id });
  return { message: "Service deleted successfully." };
};

// ── Update Service Status ────────────────────────────────────
exports.updateStatus = async (id, status, updatedBy) => {
  const allowed = ["draft", "published", "completed", "cancelled"];
  if (!allowed.includes(status))
    throw AppError.badRequest("VALIDATION", "Invalid status value");

  const service = await Service.findByPk(id);
  if (!service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");
  ensureStatusTransition(service.status, status);

  await service.update({ status });

  // ── Publish notification — broadcast to all portal members ──
  if (status === "published") {
    try {
      const portalUsers = await User.findAll({
        where: { is_active: 1, member_id: { [Op.ne]: null } },
        attributes: ["id"],
      });
      const userIds = portalUsers.map((u) => u.id);
      if (userIds.length > 0) {
        await notifService.bulkCreateNotifications(userIds, {
          type:           "service_published",
          message:        `Sunday service "${service.title}" is now open for pre-registration.`,
          reference_id:   service.id,
          reference_type: "service",
        });
      }
    } catch (err) {
      logger.error(err, "Publish notifications failed:")
    }
  }

  auditLog.log({ userId: updatedBy, action: "UPDATE_SERVICE_STATUS", targetTable: "services", targetId: id, newValues: { status } });
  return service;
};
