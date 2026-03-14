"use strict";

const auditLog = require("../helpers/auditLog.helper");
const notifService = require("./notifications.service");
const {
  InventoryItem,
  InventoryCategory,
  InventoryRequest,
  InventoryUsage,
  User,
} = require("../models");

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
  const { Op } = require("sequelize");
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

  if (category_id) where.category_id = category_id;
  if (search) {
    where.name = { [Op.like]: `%${search}%` };
  }

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
  if (!item) throw { status: 404, message: "Inventory item not found" };
  return item;
};

// ── Create Item ──────────────────────────────────────────────
exports.createItem = async (data, createdBy) => {
  const {
    name,
    category_id,
    quantity,
    unit,
    condition,
    low_stock_threshold,
    notes,
  } = data;

  if (category_id) {
    const category = await InventoryCategory.findByPk(category_id);
    if (!category)
      throw { status: 404, message: "Inventory category not found" };
  }

  const item = await InventoryItem.create({
    name,
    category_id: category_id || null,
    quantity: quantity || 0,
    unit: unit || null,
    condition: condition || null,
    low_stock_threshold: low_stock_threshold || null,
    notes: notes || null,
  });

  const created = await exports.getItemById(item.id);
  auditLog.log({ userId: createdBy, action: "CREATE_INVENTORY_ITEM", targetTable: "inventory_items", targetId: created.id });
  return created;
};

// ── Update Item ──────────────────────────────────────────────
exports.updateItem = async (id, data, updatedBy) => {
  const item = await InventoryItem.findByPk(id);
  if (!item) throw { status: 404, message: "Inventory item not found" };

  const {
    name,
    category_id,
    quantity,
    unit,
    condition,
    low_stock_threshold,
    notes,
  } = data;

  if (category_id) {
    const category = await InventoryCategory.findByPk(category_id);
    if (!category)
      throw { status: 404, message: "Inventory category not found" };
  }

  await item.update({
    ...(name && { name }),
    ...(category_id !== undefined && { category_id }),
    ...(quantity !== undefined && { quantity }),
    ...(unit !== undefined && { unit }),
    ...(condition !== undefined && { condition }),
    ...(low_stock_threshold !== undefined && { low_stock_threshold }),
    ...(notes !== undefined && { notes }),
  });

  auditLog.log({ userId: updatedBy, action: "UPDATE_INVENTORY_ITEM", targetTable: "inventory_items", targetId: id });
  return await exports.getItemById(id);
};

// ── Delete Item ──────────────────────────────────────────────
exports.deleteItem = async (id, deletedBy) => {
  const item = await InventoryItem.findByPk(id);
  if (!item) throw { status: 404, message: "Inventory item not found" };

  await item.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_INVENTORY_ITEM", targetTable: "inventory_items", targetId: id });
  return { message: "Inventory item deleted successfully." };
};

// ── Get All Categories ───────────────────────────────────────
exports.getAllCategories = async () => {
  return await InventoryCategory.findAll({ order: [["name", "ASC"]] });
};

// ── Get Category By ID ───────────────────────────────────────
exports.getCategoryById = async (id) => {
  const category = await InventoryCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Inventory category not found" };
  return category;
};

// ── Create Category ──────────────────────────────────────────
exports.createCategory = async (data) => {
  const { name } = data;
  const existing = await InventoryCategory.findOne({ where: { name } });
  if (existing) throw { status: 409, message: "Category name already exists" };
  return await InventoryCategory.create({ name });
};

// ── Update Category ──────────────────────────────────────────
exports.updateCategory = async (id, data) => {
  const category = await InventoryCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Inventory category not found" };

  const { name } = data;
  if (name && name !== category.name) {
    const existing = await InventoryCategory.findOne({ where: { name } });
    if (existing)
      throw { status: 409, message: "Category name already exists" };
  }

  await category.update({ ...(name && { name }) });
  return category;
};

// ── Delete Category ──────────────────────────────────────────
exports.deleteCategory = async (id) => {
  const category = await InventoryCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Inventory category not found" };

  const inUse = await InventoryItem.count({ where: { category_id: id } });
  if (inUse > 0)
    throw {
      status: 400,
      message: `Cannot delete. ${inUse} item(s) are using this category`,
    };

  await category.destroy();
  return { message: "Inventory category deleted successfully." };
};

// ── Get All Requests (paginated) ─────────────────────────────
exports.getAllRequests = async ({ page = 1, limit = 15, status } = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = {};
  if (status) where.status = status;

  const { count, rows } = await InventoryRequest.findAndCountAll({
    where,
    include: [
      {
        model: InventoryItem,
        as: "item",
        attributes: ["id", "name", "unit"],
        required: false,
      },
      {
        model: User,
        as: "requestedByUser",
        attributes: ["id", "email"],
        required: false,
      },
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
    include: [{ model: InventoryItem, as: "item", attributes: ["id", "name", "unit"], required: false }],
    order: [["created_at", "DESC"]],
  });
};

// ── Get Request By ID ────────────────────────────────────────
exports.getRequestById = async (id) => {
  const request = await InventoryRequest.findByPk(id, {
    include: [
      {
        model: InventoryItem,
        as: "item",
        attributes: ["id", "name", "unit"],
        required: false,
      },
    ],
  });
  if (!request) throw { status: 404, message: "Inventory request not found" };
  return request;
};

// ── Create Request ───────────────────────────────────────────
exports.createRequest = async (data, requestedBy) => {
  const { item_id, quantity, purpose } = data;

  const item = await InventoryItem.findByPk(item_id);
  if (!item) throw { status: 404, message: "Inventory item not found" };

  const request = await InventoryRequest.create({
    item_id,
    requested_by: requestedBy,
    quantity,
    purpose: purpose || null,
    status: "pending",
  });

  const created = await exports.getRequestById(request.id);
  auditLog.log({ userId: requestedBy, action: "CREATE_INVENTORY_REQUEST", targetTable: "inventory_requests", targetId: created.id });
  return created;
};

// ── Review Request (Approve/Reject) ──────────────────────────
exports.reviewRequest = async (id, status, reviewedBy) => {
  const request = await InventoryRequest.findByPk(id);
  if (!request) throw { status: 404, message: "Inventory request not found" };

  if (request.status !== "pending")
    throw { status: 400, message: "Request has already been reviewed" };

  if (!["approved", "rejected"].includes(status))
    throw { status: 400, message: "Status must be approved or rejected" };

  // If approved, deduct from inventory
  if (status === "approved") {
    const item = await InventoryItem.findByPk(request.item_id);
    if (item.quantity < request.quantity)
      throw { status: 400, message: "Insufficient inventory quantity" };
    await item.update({ quantity: item.quantity - request.quantity });
  }

  await request.update({ status, reviewed_by: reviewedBy });
  auditLog.log({ userId: reviewedBy, action: `INVENTORY_REQUEST_${status.toUpperCase()}`, targetTable: "inventory_requests", targetId: id, newValues: { status } });
  return await exports.getRequestById(id);
};

// ── Delete Request ───────────────────────────────────────────
exports.deleteRequest = async (id, deletedBy) => {
  const request = await InventoryRequest.findByPk(id);
  if (!request) throw { status: 404, message: "Inventory request not found" };

  if (request.status !== "pending")
    throw { status: 400, message: "Only pending requests can be deleted" };

  await request.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_INVENTORY_REQUEST", targetTable: "inventory_requests", targetId: id });
  return { message: "Inventory request deleted successfully." };
};

// ── Get All Usage Records ────────────────────────────────────
exports.getAllUsage = async () => {
  return await InventoryUsage.findAll({
    include: [
      {
        model: InventoryItem,
        as: "item",
        attributes: ["id", "name", "unit"],
        required: false,
      },
    ],
    order: [["used_at", "DESC"]],
  });
};

// ── Create Usage Record ──────────────────────────────────────
exports.createUsage = async (data, usedBy) => {
  const { item_id, quantity_used, used_for, used_at } = data;

  const item = await InventoryItem.findByPk(item_id);
  if (!item) throw { status: 404, message: "Inventory item not found" };

  if (item.quantity < quantity_used)
    throw { status: 400, message: "Insufficient inventory quantity" };

  await item.update({ quantity: item.quantity - quantity_used });

  return await InventoryUsage.create({
    item_id,
    quantity_used,
    used_by: usedBy,
    used_for: used_for || null,
    used_at: used_at || new Date(),
  });
};

// ── Delete Usage Record ──────────────────────────────────────
exports.deleteUsage = async (id) => {
  const usage = await InventoryUsage.findByPk(id);
  if (!usage) throw { status: 404, message: "Usage record not found" };

  await usage.destroy();
  return { message: "Usage record deleted successfully." };
};
