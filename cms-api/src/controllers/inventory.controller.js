"use strict";

const inventoryService = require("../services/inventory.service");
const { isScopedLeader } = require("../helpers/scopedLeader.helper");
const permissionCache    = require("../helpers/permissionCache.helper");
const AppError           = require("../helpers/AppError");

const forbidScopedInventoryManage = (req, res) => {
  if (!isScopedLeader(req.user)) return false;
  res.status(403).json({
    success: false,
    message: "Leaders can submit inventory requests, not manage inventory records.",
  });
  return true;
};

const scopedRequestsResponse = async (req, res) => {
  const requests = await inventoryService.getMyRequests(req.user.userId);
  res.json({
    success: true,
    data: { requests, total: requests.length, total_pages: 1 },
  });
};

const ensureOwnInventoryRequest = (request, userId) => {
  if (Number(request.requested_by) !== Number(userId)) {
    throw AppError.forbidden("This inventory request is outside your account");
  }
};

// Approvers (inventory:update) may access any request; everyone else
// is restricted to their own — regardless of role.
const canReviewInventory = async (req) => {
  if (req.user.roleName === "System Admin") return true;
  const permissions = await permissionCache.get(req.user.roleId);
  return permissions.has("inventory:update");
};

// ── Items ────────────────────────────────────────────────────
exports.getAllItems = async (req, res, next) => {
  try {
    const data = await inventoryService.getAllItems(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getInventoryReport = async (req, res, next) => {
  try {
    const data = await inventoryService.getInventoryReport();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

const csvCell = (value) => {
  let text = String(value ?? "");
  if (/^[\s]*[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

exports.exportInventoryReport = async (req, res, next) => {
  try {
    res.status(200);
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="plwm-mcc-inventory-report.csv"');
    res.write("\uFEFF");
    res.write(["Item ID", "Item", "Category", "Quantity", "Unit", "Availability", "Condition", "Low Stock Threshold"].map(csvCell).join(",") + "\r\n");

    const pageSize = 250;
    let offset = 0;
    while (true) {
      const rows = await inventoryService.getInventoryReportPage({ offset, limit: pageSize });
      for (const item of rows) {
        res.write([
          item.id,
          item.name,
          item.category?.name,
          item.quantity,
          item.unit,
          item.status,
          item.condition,
          item.low_stock_threshold,
        ].map(csvCell).join(",") + "\r\n");
      }
      if (rows.length < pageSize) break;
      offset += rows.length;
    }
    res.end();
  } catch (err) {
    if (res.headersSent) return res.destroy(err);
    next(err);
  }
};

exports.getItemById = async (req, res, next) => {
  try {
    const data = await inventoryService.getItemById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createItem = async (req, res, next) => {
  try {
    if (forbidScopedInventoryManage(req, res)) return;
    const data = await inventoryService.createItem(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateItem = async (req, res, next) => {
  try {
    if (forbidScopedInventoryManage(req, res)) return;
    const data = await inventoryService.updateItem(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.archiveItem = async (req, res, next) => {
  try {
    if (forbidScopedInventoryManage(req, res)) return;
    const data = await inventoryService.archiveItem(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
exports.deleteItem = exports.archiveItem;

// ── Categories ───────────────────────────────────────────────
exports.getAllCategories = async (req, res, next) => {
  try {
    const data = await inventoryService.getAllCategories();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getRequestContexts = async (req, res, next) => {
  try {
    const data = await inventoryService.getRequestContexts();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const data = await inventoryService.getCategoryById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    if (forbidScopedInventoryManage(req, res)) return;
    const data = await inventoryService.createCategory(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    if (forbidScopedInventoryManage(req, res)) return;
    const data = await inventoryService.updateCategory(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    if (forbidScopedInventoryManage(req, res)) return;
    const data = await inventoryService.deleteCategory(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Requests ─────────────────────────────────────────────────
exports.getAllRequests = async (req, res, next) => {
  try {
    if (isScopedLeader(req.user) || !(await canReviewInventory(req))) {
      await scopedRequestsResponse(req, res);
      return;
    }
    const data = await inventoryService.getAllRequests(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// Alias used by frontend: GET /inventory/requests/all
exports.getAllRequestsPaginated = async (req, res, next) => {
  try {
    if (isScopedLeader(req.user) || !(await canReviewInventory(req))) {
      await scopedRequestsResponse(req, res);
      return;
    }
    const data = await inventoryService.getAllRequests(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await inventoryService.getMyRequests(req.user.userId);
    res.json({ success: true, data: { requests, total: requests.length, total_pages: 1 } });
  } catch (err) {
    next(err);
  }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const data = await inventoryService.getRequestById(req.params.id);
    if (!(await canReviewInventory(req))) ensureOwnInventoryRequest(data, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createRequest = async (req, res, next) => {
  try {
    const data = await inventoryService.createRequest(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.reviewRequest = async (req, res, next) => {
  try {
    if (forbidScopedInventoryManage(req, res)) return;
    const { status, review_note } = req.body;
    const data = await inventoryService.reviewRequest(req.params.id, status, req.user.userId, review_note);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    if (!(await canReviewInventory(req))) {
      const request = await inventoryService.getRequestById(req.params.id);
      ensureOwnInventoryRequest(request, req.user.userId);
    }
    const data = await inventoryService.deleteRequest(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Usage ────────────────────────────────────────────────────
exports.getAllUsage = async (req, res, next) => {
  try {
    if (isScopedLeader(req.user)) {
      res.json({ success: true, data: { records: [], total: 0, total_pages: 0 } });
      return;
    }
    const data = await inventoryService.getAllUsage(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createUsage = async (req, res, next) => {
  try {
    if (forbidScopedInventoryManage(req, res)) return;
    const data = await inventoryService.createUsage(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteUsage = async (req, res, next) => {
  try {
    if (forbidScopedInventoryManage(req, res)) return;
    const data = await inventoryService.deleteUsage(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
