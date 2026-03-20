"use strict";

const auditLog = require("../helpers/auditLog.helper");
const { Service, ServiceAttendanceSummary, ServiceResponse } = require("../models");

// ── Get All Services (paginated) ─────────────────────────────
exports.getAllServices = async ({ page = 1, limit = 15, status } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = {};
  if (status) where.status = status;

  const { count, rows } = await Service.findAndCountAll({
    where,
    include: [
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
  if (serviceIds.length > 0) {
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
    plain.ServiceAttendanceSummary = plain.summary || null;
    // pre_registered_count = ATTENDING responses; used when actual check-ins = 0
    plain.pre_registered_count = preRegCounts[plain.id] || 0;
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
  if (!service) throw { status: 404, message: "Service not found" };
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
  const service = await Service.findByPk(id);
  if (!service) throw { status: 404, message: "Service not found" };

  if (service.status === "completed" || service.status === "cancelled")
    throw { status: 400, message: "Cannot update a completed or cancelled service" };

  const {
    title,
    service_date,
    service_time,
    capacity,
    total_parking_slots,
    response_deadline,
    status,
  } = data;

  await service.update({
    ...(title               && { title }),
    ...(service_date        && { service_date }),
    // FIX BUG 8: coerce empty string to null so clearing a time field stores NULL,
    // not an empty string that corrupts the date/time column.
    ...(service_time        !== undefined && { service_time:        service_time        || null }),
    ...(capacity            !== undefined && { capacity }),
    ...(total_parking_slots !== undefined && { total_parking_slots }),
    ...(response_deadline   !== undefined && { response_deadline:   response_deadline   || null }),
    ...(status              && { status }),
  });

  auditLog.log({ userId: updatedBy, action: "UPDATE_SERVICE", targetTable: "services", targetId: id });
  return service;
};

// ── Delete Service ───────────────────────────────────────────
exports.deleteService = async (id, deletedBy) => {
  const service = await Service.findByPk(id);
  if (!service) throw { status: 404, message: "Service not found" };
  // Completed services can be deleted (admin request)
  await service.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_SERVICE", targetTable: "services", targetId: id });
  return { message: "Service deleted successfully." };
};

// ── Update Service Status ────────────────────────────────────
exports.updateStatus = async (id, status, updatedBy) => {
  const allowed = ["draft", "published", "completed", "cancelled"];
  if (!allowed.includes(status))
    throw { status: 400, message: "Invalid status value" };

  const service = await Service.findByPk(id);
  if (!service) throw { status: 404, message: "Service not found" };

  const flow = {
    draft:     ["published", "cancelled"],
    published: ["completed", "cancelled"],
    completed: [],
    cancelled: [],
  };

  if (!flow[service.status]?.includes(status))
    throw {
      status: 400,
      message: `Cannot transition from '${service.status}' to '${status}'`,
    };

  await service.update({ status });
  auditLog.log({ userId: updatedBy, action: "UPDATE_SERVICE_STATUS", targetTable: "services", targetId: id, newValues: { status } });
  return service;
};
