"use strict";

const auditLog = require("../helpers/auditLog.helper");
const { Service, ServiceAttendanceSummary } = require("../models");

// ── Get All Services (paginated) ─────────────────────────────
exports.getAllServices = async ({ page = 1, limit = 15, status } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = {};
  if (status) where.status = status;

  const { count, rows } = await Service.findAndCountAll({
    where,
    // FIX BUG 6 (part A): include the attendance summary so ServicesPage and
    // AttendanceOverviewPage can render the progress bars.
    // The association uses alias "summary" (see models/index.js), so we must
    // use that alias here. We then remap to "ServiceAttendanceSummary" below
    // to match what the frontend already expects.
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

  // FIX BUG 6 (part B): remap alias "summary" → "ServiceAttendanceSummary"
  // so the frontend key access `svc.ServiceAttendanceSummary?.total_attended` works.
  const services = rows.map((row) => {
    const plain = row.toJSON();
    plain.ServiceAttendanceSummary = plain.summary || null;
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
