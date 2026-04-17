"use strict";

const path            = require("path");
const archivesService = require("../services/archives.service");

// ── Helper: extract file info from multer req.file ───────────
const extractFileFields = (file) => {
  if (!file) return {};
  const ext = path.extname(file.originalname).toLowerCase().replace(".", "");
  return {
    // Store as a URL path so the frontend can build the download link
    file_url:  `/uploads/archives/${file.filename}`,
    file_type: ext || file.mimetype.split("/")[1] || "unknown",
    file_size: file.size,
  };
};

// ── Records ──────────────────────────────────────────────────
exports.getAllRecords = async (req, res, next) => {
  try {
    const data = await archivesService.getAllRecords({
      ...req.query,
      roleName: req.user?.roleName,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRecordById = async (req, res, next) => {
  try {
    // Enforce single-record visibility
    const data = await archivesService.getRecordById(req.params.id);
    const roleName = req.user?.roleName;
    if (data.visibility === "confidential" && !["System Admin", "Pastor"].includes(roleName)) {
      return res.status(403).json({ success: false, message: "Access forbidden" });
    }
    if (data.visibility === "restricted" &&
        !["System Admin", "Pastor", "Finance Team", "Registration Team"].includes(roleName)) {
      return res.status(403).json({ success: false, message: "Access forbidden" });
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createRecord = async (req, res, next) => {
  try {
    // FIX BUG 1: merge text fields from req.body with file fields from req.file
    if (!req.file) {
      return res.status(400).json({ success: false, message: "A file is required." });
    }
    const payload = { ...req.body, ...extractFileFields(req.file) };
    const data    = await archivesService.createRecord(payload, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateRecord = async (req, res, next) => {
  try {
    // FIX BUG 1: merge file fields if a new file was uploaded; otherwise keep existing file
    const payload = { ...req.body, ...extractFileFields(req.file) };
    const data    = await archivesService.updateRecord(req.params.id, payload, req.user.userId);
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
    // Only System Admin can delete archives
    if (req.user?.roleName !== "System Admin") {
      return res.status(403).json({ success: false, message: "Only System Admin can delete archive records." });
    }
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
