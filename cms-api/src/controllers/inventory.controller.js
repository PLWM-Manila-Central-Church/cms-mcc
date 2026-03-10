"use strict";

const inventoryService = require("../services/inventory.service");

// ── Items ────────────────────────────────────────────────────
exports.getAllItems = async (req, res, next) => {
  try {
    const data = await inventoryService.getAllItems(req.query);
    res.json({ success: true, data });
  } catch (err) {
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
    const data = await inventoryService.createItem(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const data = await inventoryService.updateItem(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const data = await inventoryService.deleteItem(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Categories ───────────────────────────────────────────────
exports.getAllCategories = async (req, res, next) => {
  try {
    const data = await inventoryService.getAllCategories();
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
    const data = await inventoryService.createCategory(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const data = await inventoryService.updateCategory(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const data = await inventoryService.deleteCategory(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Requests ─────────────────────────────────────────────────
exports.getAllRequests = async (req, res, next) => {
  try {
    const data = await inventoryService.getAllRequests(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// Alias used by frontend: GET /inventory/requests/all
exports.getAllRequestsPaginated = async (req, res, next) => {
  try {
    const data = await inventoryService.getAllRequests(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getMyRequests = async (req, res, next) => {
  try {
    const requests = await inventoryService.getMyRequests(req.user.userId);
    res.json({ success: true, data: { requests } });
  } catch (err) {
    next(err);
  }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const data = await inventoryService.getRequestById(req.params.id);
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
    const { status } = req.body;
    const data = await inventoryService.reviewRequest(req.params.id, status, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteRequest = async (req, res, next) => {
  try {
    const data = await inventoryService.deleteRequest(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Usage ────────────────────────────────────────────────────
exports.getAllUsage = async (req, res, next) => {
  try {
    const data = await inventoryService.getAllUsage();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createUsage = async (req, res, next) => {
  try {
    const data = await inventoryService.createUsage(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteUsage = async (req, res, next) => {
  try {
    const data = await inventoryService.deleteUsage(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
