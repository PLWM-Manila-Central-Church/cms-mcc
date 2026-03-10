"use strict";

const financeService = require("../services/finance.service");

// ── Financial Records ────────────────────────────────────────
exports.getAllRecords = async (req, res, next) => {
  try {
    const result = await financeService.getAllRecords(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.getSummary = async (req, res, next) => {
  try {
    const result = await financeService.getSummary(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.getRecordById = async (req, res, next) => {
  try {
    const result = await financeService.getRecordById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.createRecord = async (req, res, next) => {
  try {
    const result = await financeService.createRecord(req.body, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateRecord = async (req, res, next) => {
  try {
    const result = await financeService.updateRecord(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.deleteRecord = async (req, res, next) => {
  try {
    const result = await financeService.deleteRecord(
      req.params.id,
      req.user.userId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

// ── Financial Categories ─────────────────────────────────────
exports.getAllCategories = async (req, res, next) => {
  try {
    const result = await financeService.getAllCategories();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const result = await financeService.getCategoryById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.createCategory = async (req, res, next) => {
  try {
    const result = await financeService.createCategory(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const result = await financeService.updateCategory(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await financeService.deleteCategory(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
