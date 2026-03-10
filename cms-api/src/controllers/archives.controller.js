"use strict";

const archivesService = require("../services/archives.service");

// ── Records ──────────────────────────────────────────────────
exports.getAllRecords = async (req, res, next) => {
  try {
    const data = await archivesService.getAllRecords(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRecordById = async (req, res, next) => {
  try {
    const data = await archivesService.getRecordById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createRecord = async (req, res, next) => {
  try {
    const data = await archivesService.createRecord(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateRecord = async (req, res, next) => {
  try {
    const data = await archivesService.updateRecord(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.approveRecord = async (req, res, next) => {
  try {
    const data = await archivesService.approveRecord(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteRecord = async (req, res, next) => {
  try {
    const data = await archivesService.deleteRecord(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Versions ─────────────────────────────────────────────────
exports.getVersions = async (req, res, next) => {
  try {
    const data = await archivesService.getVersions(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Access Logs ──────────────────────────────────────────────
exports.logView = async (req, res, next) => {
  try {
    const data = await archivesService.logAccess(req.params.id, req.user.userId, "view");
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.logDownload = async (req, res, next) => {
  try {
    const data = await archivesService.logAccess(req.params.id, req.user.userId, "download");
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getAccessLogs = async (req, res, next) => {
  try {
    const data = await archivesService.getAccessLogs(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Categories ───────────────────────────────────────────────
exports.getAllCategories = async (req, res, next) => {
  try {
    const data = await archivesService.getAllCategories();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const data = await archivesService.getCategoryById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const data = await archivesService.createCategory(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const data = await archivesService.updateCategory(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const data = await archivesService.deleteCategory(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
