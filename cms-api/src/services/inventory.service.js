"use strict";

const cache       = require("../helpers/cache.helper");
const sequelize   = require("../config/db");
const { Op, fn, col } = require("sequelize");
const auditLog     = require("../helpers/auditLog.helper");
const logger       = require("../helpers/logger");
const notifService = require("./notifications.service");
const AppError = require("../helpers/AppError");
const { INVENTORY_STATUSES, deriveInventoryStatus } = require("../helpers/inventoryStatus.helper");
const {
  InventoryItem,
  InventoryCategory,
  InventoryRequest,
  InventoryUsage,
  User,
  Role,
  Event,
  Service,
  MinistryRole,
} = require("../models");

const notifyInventoryManagers = async (payload) => {
  try {
    const roles = await Role.findAll({ where: { role_name: { [Op.in]: ["System Admin", "Inventory Manager"] } }, attributes: ["id"] });
    const roleIds = roles.map((role) => role.id);
    const users = roleIds.length
      ? await User.findAll({ where: { role_id: { [Op.in]: roleIds }, is_active: 1, is_deleted: 0 }, attributes: ["id"] })
      : [];
    await notifService.bulkCreateNotifications(users.map((user) => user.id), payload);
  } catch (error) {
    logger.error(error, "Inventory notification failed");
  }
};

const notifyInventoryStatusChange = async (item, status) => {
  const messages = {
    "Low Stock": `Inventory item "${item.name}" is low (${item.quantity} ${item.unit || "units"} remaining).`,
    "Out of Stock": `Inventory item "${item.name}" is out of stock.`,
    "Under Repair": `Inventory item "${item.name}" was placed Under Repair.`,
    Available: `Inventory item "${item.name}" is available again.`,
  };
  const types = {
    "Low Stock": "inventory_item_low_stock",
    "Out of Stock": "inventory_item_out_of_stock",
    "Under Repair": "inventory_item_under_repair",
    Available: "inventory_item_available",
  };
  if (!messages[status]) return;

  await notifyInventoryManagers({
    type: types[status],
    message: messages[status],
    reference_id: item.id,
    reference_type: "inventory_item",
  });

  let pendingRequesterIds = [];
  try {
    const pendingRequests = await InventoryRequest.findAll({
      where: { item_id: item.id, status: "pending" },
      attributes: ["requested_by"],
    });
    pendingRequesterIds = [...new Set(pendingRequests.map((request) => Number(request.requested_by)).filter(Boolean))];
  } catch (error) {
    logger.error(error, "Inventory requester notification lookup failed");
  }

  if (pendingRequesterIds.length) {
    try {
      await notifService.bulkCreateNotifications(pendingRequesterIds, {
      type: status === "Available" ? "inventory_request_item_available" : `inventory_request_item_${status.toLowerCase().replace(/\s+/g, "_")}`,
      message: status === "Available"
        ? `The requested item "${item.name}" is available again; your pending request remains open.`
        : `The requested item "${item.name}" is ${status.toLowerCase()}; your pending request remains open.`,
      reference_id: item.id,
      reference_type: "inventory_item",
      });
    } catch (error) {
      logger.error(error, "Inventory requester notification failed");
    }
  }
};

const itemIncludes = [
  {
    model: InventoryCategory,
    as: "category",
    attributes: ["id", "name"],
    required: false,
  },
];

// ── Get All Items (paginated) ────────────────────────────────
exports.getAllItems = async ({ page = 1, limit = 15, search, category_id, status } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = { is_deleted: 0 };

  if (category_id) where.category_id = category_id;
  if (search)      where.name = { [Op.like]: `%${search}%` };
  if (status)      where.status = status;

  const { count, rows } = await InventoryItem.findAndCountAll({
    where,
    include: itemIncludes,
    order: [["name", "ASC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  return {
    items: rows,
    total: count,
    total_pages: Math.ceil(count / parseInt(limit)),
  };
};

exports.getInventoryReport = async () => {
  const [totalItems, totalQuantity, statusRows, usageCount, usedQuantity, requestRows] = await Promise.all([
    InventoryItem.count({ where: { is_deleted: 0 } }),
    InventoryItem.sum("quantity", { where: { is_deleted: 0 } }),
    InventoryItem.findAll({
      where: { is_deleted: 0 },
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true,
    }),
    InventoryUsage.count({ where: { is_reversed: 0 } }),
    InventoryUsage.sum("quantity_used", { where: { is_reversed: 0 } }),
    InventoryRequest.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true,
    }),
  ]);

  const statusCounts = new Map(statusRows.map((row) => [row.status, Number(row.count || 0)]));
  const requestCounts = new Map(requestRows.map((row) => [row.status, Number(row.count || 0)]));
  return {
    generated_at: new Date().toISOString(),
    total_items: Number(totalItems || 0),
    total_quantity: Number(totalQuantity || 0),
    statuses: INVENTORY_STATUSES.map((status) => ({ status, count: statusCounts.get(status) || 0 })),
    usage: { records: Number(usageCount || 0), quantity_used: Number(usedQuantity || 0) },
    requests: ["pending", "approved", "rejected"].map((status) => ({ status, count: requestCounts.get(status) || 0 })),
  };
};

exports.getInventoryReportPage = async ({ offset = 0, limit = 250 } = {}) =>
  InventoryItem.findAll({
    where: { is_deleted: 0 },
    include: itemIncludes,
    order: [["name", "ASC"], ["id", "ASC"]],
    offset: Number(offset),
    limit: Number(limit),
  });

// ── Get Item By ID ───────────────────────────────────────────
exports.getItemById = async (id) => {
  const item = await InventoryItem.findOne({ where: { id, is_deleted: 0 }, include: itemIncludes });
  if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");
  return item;
};

// ── Create Item ──────────────────────────────────────────────
exports.createItem = async (data, createdBy) => {
  const { name, category_id, quantity, unit, condition, status = "Available", low_stock_threshold, notes } = data;

  const qty = parseInt(quantity, 10) || 0;
  if (qty < 0)
    throw AppError.badRequest("VALIDATION", "Quantity must be zero or a positive number");

  if (category_id) {
    const category = await InventoryCategory.findByPk(category_id);
    if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory category not found");
  }

  const item = await InventoryItem.create({
    name,
    category_id:         category_id         || null,
    quantity:            qty,
    unit:                unit                 || null,
    condition:           condition            || null,
    status:              deriveInventoryStatus({ quantity: qty, low_stock_threshold, status }),
    low_stock_threshold: low_stock_threshold ?? null,
    notes:               notes               || null,
  });

  const created = await exports.getItemById(item.id);
  auditLog.log({ userId: createdBy, action: "CREATE_INVENTORY_ITEM", targetTable: "inventory_items", targetId: created.id });
  if (created.status !== "Available") await notifyInventoryStatusChange(created, created.status);
  return created;
};

// ── Update Item ──────────────────────────────────────────────
exports.updateItem = async (id, data, updatedBy) => {
  const item = await InventoryItem.findOne({ where: { id, is_deleted: 0 } });
  if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");

  const { name, category_id, quantity, unit, condition, status, low_stock_threshold, notes } = data;
  const previousStatus = item.status || "Available";
  const nextQuantity = quantity !== undefined ? Math.max(0, parseInt(quantity, 10) || 0) : Number(item.quantity);
  const nextThreshold = low_stock_threshold !== undefined ? low_stock_threshold : item.low_stock_threshold;
  const nextStatus = deriveInventoryStatus({
    quantity: nextQuantity,
    low_stock_threshold: nextThreshold,
    status: status === undefined ? previousStatus : status,
  });

  if (category_id) {
    const category = await InventoryCategory.findByPk(category_id);
    if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory category not found");
  }

  await item.update({
    ...(name                !== undefined && { name }),
    ...(category_id         !== undefined && { category_id }),
    ...(quantity            !== undefined && { quantity: nextQuantity }),
    ...(unit                !== undefined && { unit }),
    ...(condition           !== undefined && { condition }),
    status: nextStatus,
    ...(low_stock_threshold !== undefined && { low_stock_threshold: nextThreshold }),
    ...(notes               !== undefined && { notes }),
  });

  auditLog.log({ userId: updatedBy, action: "UPDATE_INVENTORY_ITEM", targetTable: "inventory_items", targetId: id });
  const updated = await exports.getItemById(id);
  if (previousStatus !== updated.status) {
    await notifyInventoryStatusChange(updated, updated.status);
  }
  return updated;
};

// ── Archive Item ─────────────────────────────────────────────
exports.archiveItem = async (id, deletedBy) => {
  const item = await InventoryItem.findOne({ where: { id, is_deleted: 0 } });
  if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");

  await item.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: deletedBy });
  auditLog.log({ userId: deletedBy, action: "ARCHIVE_INVENTORY_ITEM", targetTable: "inventory_items", targetId: id });
  cache.keys("dashboard:*").forEach((key) => cache.del(key));
  return { message: "Inventory item archived successfully. Usage and request history were retained." };
};
exports.deleteItem = exports.archiveItem;

// ── Get All Categories ───────────────────────────────────────
exports.getAllCategories = async () => {
  return await InventoryCategory.findAll({ order: [["name", "ASC"]] });
};

exports.getRequestContexts = async () => {
  const [events, services, ministries] = await Promise.all([
    Event.findAll({ where: { is_deleted: 0, status: { [Op.in]: ["Upcoming", "Ongoing"] } }, attributes: ["id", "title", "start_date"], order: [["start_date", "ASC"]], limit: 100 }),
    Service.findAll({ where: { status: "published", is_deleted: 0 }, attributes: ["id", "title", "service_date"], order: [["service_date", "DESC"]], limit: 100 }),
    MinistryRole.findAll({ where: { is_deleted: 0 }, attributes: ["id", "name"], order: [["name", "ASC"]] }),
  ]);
  return { events, services, ministries };
};

exports.getCategoryById = async (id) => {
  const category = await InventoryCategory.findByPk(id);
  if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory category not found");
  return category;
};

exports.createCategory = async (data) => {
  const { name } = data;
  const existing = await InventoryCategory.findOne({ where: { name } });
  if (existing) throw AppError.conflict("DUPLICATE", "Category name already exists");
  return await InventoryCategory.create({ name });
};

exports.updateCategory = async (id, data) => {
  const category = await InventoryCategory.findByPk(id);
  if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory category not found");

  const { name } = data;
  if (name && name !== category.name) {
    const existing = await InventoryCategory.findOne({ where: { name } });
    if (existing) throw AppError.conflict("DUPLICATE", "Category name already exists");
  }

  await category.update({ ...(name && { name }) });
  return category;
};

exports.deleteCategory = async (id) => {
  const category = await InventoryCategory.findByPk(id);
  if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory category not found");

  const inUse = await InventoryItem.count({ where: { category_id: id } });
  if (inUse > 0)
    throw AppError.badRequest("VALIDATION", `Cannot delete. ${inUse} item(s) use this category`);

  await category.destroy();
  return { message: "Inventory category deleted successfully." };
};

// ── Get All Requests (paginated) ─────────────────────────────
exports.getAllRequests = async ({ page = 1, limit = 15, status } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = {};
  if (status) where.status = status;

  const { count, rows } = await InventoryRequest.findAndCountAll({
    where,
    include: [
      { model: InventoryItem, as: "item",             attributes: ["id", "name", "unit"], required: false },
      { model: Event, as: "event", attributes: ["id", "title"], required: false },
      { model: Service, as: "service", attributes: ["id", "title"], required: false },
      { model: MinistryRole, as: "ministryRole", attributes: ["id", "name"], required: false },
      { model: User,          as: "requestedByUser",  attributes: ["id", "email"],        required: false },
      { model: User,          as: "reviewedByUser",   attributes: ["id", "email"],        required: false },
    ],
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  return {
    requests: rows,
    total: count,
    total_pages: Math.ceil(count / parseInt(limit)),
  };
};

exports.getMyRequests = async (userId) => {
  return await InventoryRequest.findAll({
    where: { requested_by: userId },
    include: [
      { model: InventoryItem, as: "item", attributes: ["id", "name", "unit", "status"], required: false },
      { model: Event, as: "event", attributes: ["id", "title"], required: false },
      { model: Service, as: "service", attributes: ["id", "title"], required: false },
      { model: MinistryRole, as: "ministryRole", attributes: ["id", "name"], required: false },
      { model: User, as: "reviewedByUser", attributes: ["id", "email"], required: false },
    ],
    order: [["created_at", "DESC"]],
  });
};

exports.getRequestById = async (id) => {
  const request = await InventoryRequest.findByPk(id, {
    include: [
      { model: InventoryItem, as: "item", attributes: ["id", "name", "unit"], required: false },
      { model: Event, as: "event", attributes: ["id", "title"], required: false },
      { model: Service, as: "service", attributes: ["id", "title"], required: false },
      { model: MinistryRole, as: "ministryRole", attributes: ["id", "name"], required: false },
      { model: User, as: "reviewedByUser", attributes: ["id", "email"], required: false },
    ],
  });
  if (!request) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory request not found");
  return request;
};

// ── Create Request ───────────────────────────────────────────
exports.createRequest = async (data, requestedBy) => {
  const itemId = Number(data.item_id);
  const quantity = data.quantity;
  const purpose = String(data.purpose || "").trim() || null;
  const eventId = data.event_id == null || data.event_id === "" ? null : Number(data.event_id);
  const serviceId = data.service_id == null || data.service_id === "" ? null : Number(data.service_id);
  const ministryRoleId = data.ministry_role_id == null || data.ministry_role_id === "" ? null : Number(data.ministry_role_id);
  const requestKey = String(data.request_key || "").trim() || null;

  const linkedContexts = [eventId, serviceId, ministryRoleId].filter((value) => value != null);
  if (linkedContexts.length > 1) throw AppError.badRequest("INVALID_REQUEST_CONTEXT", "Link a request to only one event, service, or ministry");

  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty <= 0)
    throw AppError.badRequest("VALIDATION", "Quantity must be a positive integer");

  const payload = {
    item_id: itemId,
    event_id: eventId,
    service_id: serviceId,
    ministry_role_id: ministryRoleId,
    requested_by: Number(requestedBy),
    quantity: qty,
    purpose,
    request_key: requestKey,
  };
  const samePayload = (existing) => Number(existing.item_id) === payload.item_id
    && Number(existing.quantity) === payload.quantity
    && Number(existing.requested_by) === payload.requested_by
    && (existing.event_id == null ? null : Number(existing.event_id)) === payload.event_id
    && (existing.service_id == null ? null : Number(existing.service_id)) === payload.service_id
    && (existing.ministry_role_id == null ? null : Number(existing.ministry_role_id)) === payload.ministry_role_id
    && (String(existing.purpose || "").trim() || null) === payload.purpose;
  const returnReplay = async (existing) => {
    if (!samePayload(existing)) {
      throw AppError.conflict("INVENTORY_REQUEST_KEY_REUSED", "This request key was already used for a different request. Start a new request.");
    }
    return await exports.getRequestById(existing.id);
  };

  if (requestKey) {
    const existing = await InventoryRequest.findOne({ where: { requested_by: payload.requested_by, request_key: requestKey } });
    if (existing) return await returnReplay(existing);
  }

  let result;
  try {
    result = await sequelize.transaction(async (transaction) => {
      const item = await InventoryItem.findOne({ where: { id: itemId, is_deleted: 0 }, transaction, lock: transaction.LOCK.UPDATE });
      if (requestKey) {
        const existing = await InventoryRequest.findOne({
          where: { requested_by: payload.requested_by, request_key: requestKey },
          transaction,
        });
        if (existing) return { id: existing.id, created: false, existing };
      }

      if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");
      if (item.status === "Under Repair") throw AppError.badRequest("ITEM_UNDER_REPAIR", "This item is under repair and cannot be requested");
      if (Number(item.quantity) <= 0 || item.status === "Out of Stock") throw AppError.badRequest("ITEM_OUT_OF_STOCK", "This item is out of stock and cannot be requested");

      const [event, service, ministryRole] = await Promise.all([
        eventId ? Event.findByPk(eventId, { transaction }) : null,
        serviceId ? Service.findOne({ where: { id: serviceId, is_deleted: 0 }, transaction }) : null,
        ministryRoleId ? MinistryRole.findOne({ where: { id: ministryRoleId, is_deleted: 0 }, transaction }) : null,
      ]);
      if (eventId && !event) throw AppError.notFound("RECORD_NOT_FOUND", "Event not found");
      if (serviceId && !service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");
      if (ministryRoleId && !ministryRole) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry not found");
      if (eventId && !["Upcoming", "Ongoing"].includes(event.status)) {
        throw AppError.badRequest("INVALID_REQUEST_CONTEXT", "Inventory requests can only be linked to upcoming or ongoing Events");
      }
      if (serviceId && service.status !== "published") {
        throw AppError.badRequest("INVALID_REQUEST_CONTEXT", "Inventory requests can only be linked to published Services");
      }

      const request = await InventoryRequest.create({
        ...payload,
        status: "pending",
      }, { transaction });
      return { id: request.id, created: true, itemName: item.name };
    });
  } catch (error) {
    if (requestKey && ["SequelizeUniqueConstraintError", "UniqueConstraintError"].includes(error?.name)) {
      const existing = await InventoryRequest.findOne({ where: { requested_by: payload.requested_by, request_key: requestKey } });
      if (existing) return await returnReplay(existing);
    }
    throw error;
  }

  if (!result.created) return await returnReplay(result.existing);

  const created = await exports.getRequestById(result.id);
  auditLog.log({ userId: requestedBy, action: "CREATE_INVENTORY_REQUEST", targetTable: "inventory_requests", targetId: created.id });
  cache.keys("dashboard:*").forEach((key) => cache.del(key));
  await notifyInventoryManagers({ type: "inventory_request_submitted", message: `A new request was submitted for ${result.itemName}.`, reference_id: created.id, reference_type: "inventory_request" });
  return created;
};

// ── Review Request (Approve/Reject) ──────────────────────────
exports.reviewRequest = async (id, status, reviewedBy, reviewNote) => {
  const normalized = (status || "").toLowerCase();
  if (!["approved", "rejected"].includes(normalized))
    throw AppError.badRequest("VALIDATION", "Status must be approved or rejected");

  let statusChange = null;
  await sequelize.transaction(async (t) => {
    // Lock the request row for update to prevent concurrent reviews
    const request = await InventoryRequest.findOne({
      where: { id },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!request) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory request not found");

    if (request.status !== "pending")
      throw AppError.badRequest("VALIDATION", "Request has already been reviewed");

    if (normalized === "approved") {
      // Lock the item row and use decrement for atomic quantity update
      const item = await InventoryItem.findOne({
        where: { id: request.item_id },
        lock: t.LOCK.UPDATE,
        transaction: t,
      });
      if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");
      if (item.status === "Under Repair") throw AppError.badRequest("ITEM_UNDER_REPAIR", "This item is under repair and cannot be issued");
      if (item.quantity < request.quantity)
        throw AppError.badRequest("VALIDATION", "Insufficient inventory quantity");
      const previousStatus = item.status || "Available";
      const nextQuantity = Number(item.quantity) - Number(request.quantity);
      await item.decrement("quantity", { by: request.quantity, transaction: t });
      const nextStatus = deriveInventoryStatus({ quantity: nextQuantity, low_stock_threshold: item.low_stock_threshold, status: previousStatus });
      if (nextStatus !== previousStatus) {
        await item.update({ status: nextStatus }, { transaction: t });
        statusChange = { id: item.id, name: item.name, unit: item.unit, quantity: nextQuantity, status: nextStatus };
      }
    }

    await request.update(
      { status: normalized, reviewed_by: reviewedBy, review_note: reviewNote || null },
      { transaction: t }
    );

    // Audit log inside transaction
    const { AuditLog } = require("../models");
    await AuditLog.create({
      user_id: reviewedBy,
      action: `INVENTORY_REQUEST_${normalized.toUpperCase()}`,
      target_table: "inventory_requests",
      target_id: id,
      new_values: { status: normalized },
    }, { transaction: t });
  });

  if (statusChange) await notifyInventoryStatusChange(statusChange, statusChange.status);

  // Notify requester (outside transaction — non-fatal if it fails)
  try {
    const request = await InventoryRequest.findByPk(id, { attributes: ["requested_by", "item_id"] });
    if (request) {
      const requester = await User.findByPk(request.requested_by, { attributes: ["id"] });
      if (requester) {
        const itemRecord = await InventoryItem.findByPk(request.item_id, { attributes: ["name"] });
        const itemName   = itemRecord?.name || "item";
        const notifService = require("./notifications.service");
        await notifService.createNotification({
          user_id: requester.id,
          type:    "inventory_request_reviewed",
          message: `Your inventory request for "${itemName}" has been ${normalized}.`,
          reference_id: id,
          reference_type: "inventory_request",
        });
      }
    }
  } catch (err) {
    const logger = require("../helpers/logger");
    logger.error(err, "Review notification failed:");
  }

  return await exports.getRequestById(id);
};

// ── Delete Request ───────────────────────────────────────────
exports.deleteRequest = async (id, deletedBy) => {
  const request = await InventoryRequest.findByPk(id);
  if (!request) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory request not found");

  if (request.status !== "pending")
    throw AppError.badRequest("VALIDATION", "Only pending requests can be deleted");

  await request.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_INVENTORY_REQUEST", targetTable: "inventory_requests", targetId: id });
  return { message: "Inventory request deleted successfully." };
};

// ── Get All Usage Records ────────────────────────────────────
exports.getAllUsage = async ({ page = 1, limit = 15 } = {}) => {
  const parsedPage = Number.parseInt(page, 10);
  const parsedLimit = Number.parseInt(limit, 10);
  const { count, rows } = await InventoryUsage.findAndCountAll({
    include: [
      { model: InventoryItem, as: "item", attributes: ["id", "name", "unit"], required: false },
      { model: User, as: "usedByUser", attributes: ["id", "email"], required: false },
    ],
    order: [["used_at", "DESC"], ["id", "DESC"]],
    limit: parsedLimit,
    offset: (parsedPage - 1) * parsedLimit,
    distinct: true,
  });
  return { records: rows, total: count, total_pages: Math.ceil(count / parsedLimit) };
};

// ── Create Usage Record ──────────────────────────────────────
exports.createUsage = async (data, usedBy) => {
  const { item_id, used_for } = data;
  const quantity_used = data.quantity_used ?? data.quantity;
  const used_at = data.used_at ?? data.used_date;

  const qty = parseInt(quantity_used, 10);
  if (!Number.isInteger(qty) || qty <= 0)
    throw AppError.badRequest("VALIDATION", "Quantity used must be a positive integer");

  // Same pattern as reviewRequest: lock the item row so concurrent usage
  // records cannot both pass the sufficiency check and drive stock negative.
  let statusChange = null;
  const usage = await sequelize.transaction(async (t) => {
    const item = await InventoryItem.findOne({
      where: { id: item_id },
      lock: t.LOCK.UPDATE,
      transaction: t,
    });
    if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");
    if (item.status === "Under Repair") throw AppError.badRequest("ITEM_UNDER_REPAIR", "This item is under repair and cannot be used");

    if (item.quantity < qty)
      throw AppError.badRequest("VALIDATION", "Insufficient inventory quantity");

    const previousStatus = item.status || "Available";
    const nextQuantity = Number(item.quantity) - qty;

    await item.decrement("quantity", { by: qty, transaction: t });
    const nextStatus = deriveInventoryStatus({ quantity: nextQuantity, low_stock_threshold: item.low_stock_threshold, status: previousStatus });
    if (nextStatus !== previousStatus) {
      await item.update({ status: nextStatus }, { transaction: t });
      statusChange = { id: item.id, name: item.name, unit: item.unit, quantity: nextQuantity, status: nextStatus };
    }

    return await InventoryUsage.create({
      item_id,
      quantity_used: qty,
      used_by:  usedBy,
      used_for: used_for || null,
      used_at:  used_at  || new Date(),
    }, { transaction: t });
  });
  if (statusChange) await notifyInventoryStatusChange(statusChange, statusChange.status);
  return usage;
};

// ── Delete Usage Record ──────────────────────────────────────
exports.deleteUsage = async (id, deletedBy) => {
  let statusChange = null;
  await sequelize.transaction(async (transaction) => {
    const usage = await InventoryUsage.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!usage) throw AppError.notFound("RECORD_NOT_FOUND", "Usage record not found");
    if (Number(usage.is_reversed)) throw AppError.conflict("USAGE_ALREADY_REVERSED", "This usage has already been reversed");
    const item = await InventoryItem.findByPk(usage.item_id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");
    const previousStatus = item.status || "Available";
    const nextQuantity = Number(item.quantity) + Number(usage.quantity_used);
    const nextStatus = deriveInventoryStatus({ quantity: nextQuantity, low_stock_threshold: item.low_stock_threshold, status: previousStatus });
    await item.update({ quantity: nextQuantity, status: nextStatus }, { transaction });
    await usage.update({ is_reversed: 1, reversed_at: new Date(), reversed_by: deletedBy }, { transaction });
    await auditLog.log({ userId: deletedBy, action: "REVERSE_INVENTORY_USAGE", targetTable: "inventory_usage", targetId: id }, { transaction });
    if (nextStatus !== previousStatus) {
      statusChange = { id: item.id, name: item.name, unit: item.unit, quantity: nextQuantity, status: nextStatus };
    }
  });
  if (statusChange) await notifyInventoryStatusChange(statusChange, statusChange.status);
  return { message: "Usage reversed. The usage history was retained and stock was restored." };
};
