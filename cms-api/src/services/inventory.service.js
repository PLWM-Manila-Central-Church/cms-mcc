"use strict";

const cache       = require("../helpers/cache.helper");
const sequelize   = require("../config/db");
const { Op }      = require("sequelize");
const auditLog     = require("../helpers/auditLog.helper");
const logger       = require("../helpers/logger");
const notifService = require("./notifications.service");
const AppError = require("../helpers/AppError");
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

const itemIncludes = [
  {
    model: InventoryCategory,
    as: "category",
    attributes: ["id", "name"],
    required: false,
  },
];

// ── Get All Items (paginated) ────────────────────────────────
exports.getAllItems = async ({ page = 1, limit = 15, search, category_id } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

  if (category_id) where.category_id = category_id;
  if (search)      where.name = { [Op.like]: `%${search}%` };

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

// ── Get Item By ID ───────────────────────────────────────────
exports.getItemById = async (id) => {
  const item = await InventoryItem.findByPk(id, { include: itemIncludes });
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
    status,
    low_stock_threshold: low_stock_threshold  || null,
    notes:               notes               || null,
  });

  const created = await exports.getItemById(item.id);
  auditLog.log({ userId: createdBy, action: "CREATE_INVENTORY_ITEM", targetTable: "inventory_items", targetId: created.id });
  if (created.status === "Under Repair") {
    await notifyInventoryManagers({ type: "inventory_item_under_repair", message: `Inventory item "${created.name}" was added as Under Repair.`, reference_id: created.id, reference_type: "inventory_item" });
  }
  return created;
};

// ── Update Item ──────────────────────────────────────────────
exports.updateItem = async (id, data, updatedBy) => {
  const item = await InventoryItem.findByPk(id);
  if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");

  const { name, category_id, quantity, unit, condition, status, low_stock_threshold, notes } = data;
  const wasLow = item.low_stock_threshold != null && item.quantity <= item.low_stock_threshold;
  const previousStatus = item.status || "Available";

  if (category_id) {
    const category = await InventoryCategory.findByPk(category_id);
    if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory category not found");
  }

  await item.update({
    ...(name                !== undefined && { name }),
    ...(category_id         !== undefined && { category_id }),
    ...(quantity            !== undefined && { quantity: Math.max(0, parseInt(quantity, 10) || 0) }),
    ...(unit                !== undefined && { unit }),
    ...(condition           !== undefined && { condition }),
    ...(status              !== undefined && { status }),
    ...(low_stock_threshold !== undefined && { low_stock_threshold }),
    ...(notes               !== undefined && { notes }),
  });

  auditLog.log({ userId: updatedBy, action: "UPDATE_INVENTORY_ITEM", targetTable: "inventory_items", targetId: id });
  const updated = await exports.getItemById(id);
  if (previousStatus !== updated.status) {
    const underRepair = updated.status === "Under Repair";
    await notifyInventoryManagers({
      type: underRepair ? "inventory_item_under_repair" : "inventory_item_available",
      message: underRepair ? `Inventory item "${updated.name}" was placed Under Repair.` : `Inventory item "${updated.name}" is available again.`,
      reference_id: updated.id,
      reference_type: "inventory_item",
    });
    try {
      const pendingRequests = await InventoryRequest.findAll({ where: { item_id: updated.id, status: "pending" }, attributes: ["requested_by"] });
      const recipients = [...new Set(pendingRequests.map((request) => Number(request.requested_by)).filter(Boolean))];
      await notifService.bulkCreateNotifications(recipients, {
        type: underRepair ? "inventory_request_item_unavailable" : "inventory_request_item_available",
        message: underRepair ? `The requested item "${updated.name}" is under repair; your pending request remains open.` : `The requested item "${updated.name}" is available again; your pending request remains open.`,
        reference_id: updated.id,
        reference_type: "inventory_item",
      });
    } catch (error) {
      logger.error(error, "Inventory availability notification failed");
    }
  }
  const isLow = updated.low_stock_threshold != null && updated.quantity <= updated.low_stock_threshold;
  if (!wasLow && isLow) {
    await notifyInventoryManagers({ type: "inventory_item_low_stock", message: `Inventory item "${updated.name}" reached its low-stock threshold (${updated.quantity} ${updated.unit || "units"} remaining).`, reference_id: updated.id, reference_type: "inventory_item" });
  }
  return updated;
};

// ── Delete Item ──────────────────────────────────────────────
exports.deleteItem = async (id, deletedBy) => {
  const item = await InventoryItem.findByPk(id);
  if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");

  await item.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_INVENTORY_ITEM", targetTable: "inventory_items", targetId: id });
  return { message: "Inventory item deleted successfully." };
};

// ── Get All Categories ───────────────────────────────────────
exports.getAllCategories = async () => {
  return await InventoryCategory.findAll({ order: [["name", "ASC"]] });
};

exports.getRequestContexts = async () => {
  const [events, services, ministries] = await Promise.all([
    Event.findAll({ where: { is_deleted: 0, status: { [Op.in]: ["Upcoming", "Ongoing"] } }, attributes: ["id", "title", "start_date"], order: [["start_date", "ASC"]], limit: 100 }),
    Service.findAll({ where: { status: "published" }, attributes: ["id", "title", "service_date"], order: [["service_date", "DESC"]], limit: 100 }),
    MinistryRole.findAll({ attributes: ["id", "name"], order: [["name", "ASC"]] }),
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
    ],
  });
  if (!request) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory request not found");
  return request;
};

// ── Create Request ───────────────────────────────────────────
exports.createRequest = async (data, requestedBy) => {
  const { item_id, quantity, purpose, event_id, service_id, ministry_role_id } = data;

  const linkedContexts = [event_id, service_id, ministry_role_id].filter((value) => value != null);
  if (linkedContexts.length > 1) throw AppError.badRequest("INVALID_REQUEST_CONTEXT", "Link a request to only one event, service, or ministry");

  const qty = parseInt(quantity, 10);
  if (!Number.isInteger(qty) || qty <= 0)
    throw AppError.badRequest("VALIDATION", "Quantity must be a positive integer");

  const item = await InventoryItem.findByPk(item_id);
  if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");
  if (item.status === "Under Repair") throw AppError.badRequest("ITEM_UNDER_REPAIR", "This item is under repair and cannot be requested");
  const [event, service, ministryRole] = await Promise.all([
    event_id ? Event.findByPk(event_id) : null,
    service_id ? Service.findByPk(service_id) : null,
    ministry_role_id ? MinistryRole.findByPk(ministry_role_id) : null,
  ]);
  if (event_id && !event) throw AppError.notFound("RECORD_NOT_FOUND", "Event not found");
  if (service_id && !service) throw AppError.notFound("RECORD_NOT_FOUND", "Service not found");
  if (ministry_role_id && !ministryRole) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry not found");

  const request = await InventoryRequest.create({
    item_id,
    event_id: event_id || null,
    service_id: service_id || null,
    ministry_role_id: ministry_role_id || null,
    requested_by: requestedBy,
    quantity: qty,
    purpose: purpose || null,
    status: "pending",
  });

  const created = await exports.getRequestById(request.id);
    auditLog.log({ userId: requestedBy, action: "CREATE_INVENTORY_REQUEST", targetTable: "inventory_requests", targetId: created.id });
    cache.keys("dashboard:*").forEach(k => cache.del(k));
  await notifyInventoryManagers({ type: "inventory_request_submitted", message: `A new request was submitted for ${item.name}.`, reference_id: created.id, reference_type: "inventory_request" });
    return created;
};

// ── Review Request (Approve/Reject) ──────────────────────────
exports.reviewRequest = async (id, status, reviewedBy, reviewNote) => {
  const normalized = (status || "").toLowerCase();
  if (!["approved", "rejected"].includes(normalized))
    throw AppError.badRequest("VALIDATION", "Status must be approved or rejected");

  let stockNotice = null;
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
      const nextQuantity = Number(item.quantity) - Number(request.quantity);
      if (item.low_stock_threshold != null && item.quantity > item.low_stock_threshold && nextQuantity <= item.low_stock_threshold) {
        stockNotice = { name: item.name, quantity: nextQuantity, unit: item.unit || "units", id: item.id };
      }
      await item.decrement("quantity", { by: request.quantity, transaction: t });
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

  if (stockNotice) {
    await notifyInventoryManagers({ type: "inventory_item_low_stock", message: `Inventory item "${stockNotice.name}" reached its low-stock threshold (${stockNotice.quantity} ${stockNotice.unit} remaining).`, reference_id: stockNotice.id, reference_type: "inventory_item" });
  }

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
exports.getAllUsage = async () => {
  return await InventoryUsage.findAll({
    include: [
      { model: InventoryItem, as: "item", attributes: ["id", "name", "unit"], required: false },
    ],
    order: [["used_at", "DESC"]],
  });
};

// ── Create Usage Record ──────────────────────────────────────
exports.createUsage = async (data, usedBy) => {
  const { item_id, quantity_used, used_for, used_at } = data;

  const qty = parseInt(quantity_used, 10);
  if (!Number.isInteger(qty) || qty <= 0)
    throw AppError.badRequest("VALIDATION", "Quantity used must be a positive integer");

  // Same pattern as reviewRequest: lock the item row so concurrent usage
  // records cannot both pass the sufficiency check and drive stock negative.
  let stockNotice = null;
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

    const nextQuantity = Number(item.quantity) - qty;
    if (item.low_stock_threshold != null && item.quantity > item.low_stock_threshold && nextQuantity <= item.low_stock_threshold) {
      stockNotice = { name: item.name, quantity: nextQuantity, unit: item.unit || "units", id: item.id };
    }

    await item.decrement("quantity", { by: qty, transaction: t });

    return await InventoryUsage.create({
      item_id,
      quantity_used: qty,
      used_by:  usedBy,
      used_for: used_for || null,
      used_at:  used_at  || new Date(),
    }, { transaction: t });
  });
  if (stockNotice) {
    await notifyInventoryManagers({ type: "inventory_item_low_stock", message: `Inventory item "${stockNotice.name}" reached its low-stock threshold (${stockNotice.quantity} ${stockNotice.unit} remaining).`, reference_id: stockNotice.id, reference_type: "inventory_item" });
  }
  return usage;
};

// ── Delete Usage Record ──────────────────────────────────────
exports.deleteUsage = async (id) => {
  const usage = await InventoryUsage.findByPk(id);
  if (!usage) throw AppError.notFound("RECORD_NOT_FOUND", "Usage record not found");

  await usage.destroy();
  return { message: "Usage record deleted successfully." };
};
