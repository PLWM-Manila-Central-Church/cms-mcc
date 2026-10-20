"use strict";

const archivesService = require("../services/archives.service");
const uploadStorage   = require("../middlewares/upload-s3");
const { normalizeArchiveFileType } = require("../helpers/archiveFileMetadata.helper");
const { getFileUrl } = uploadStorage;

// ── Helper: extract file info from multer req.file ───────────
const extractFileFields = (file) => {
  if (!file) return {};
  const storageKey = file.key || `archives/${file.filename}`;
  return {
    // Store the authenticated application route for both disk and object storage.
    file_url: getFileUrl(storageKey),
    file_type: normalizeArchiveFileType(file),
    file_size: file.size,
  };
};

// ── Records ──────────────────────────────────────────────────
exports.getAllRecords = async (req, res, next) => {
  try {
    const data = await archivesService.getAllRecords({
      ...req.query,
      archived: req.query.archived === true || req.query.archived === "true",
      roleName: req.user?.roleName,
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRecordById = async (req, res, next) => {
  try {
    const data = await archivesService.getRecordByIdForRole(req.params.id, req.user?.roleName, {
      includeArchived: req.query.include_archived === "true",
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createRecord = async (req, res, next) => {
  try {
    // FIX BUG 1: merge text fields from req.body with file fields from req.file
    if (!req.file) {
      return res.status(400).json({ success: false, message: "A file is required." });
    }
    // Finance Team can only upload to "Financial Records" category
    if (req.user?.roleName === "Finance Team") {
      const { ArchiveCategory } = require("../models");
      const cat = await ArchiveCategory.findByPk(req.body.category_id);
      if (!cat || cat.name !== "Financial Records") {
        return res.status(403).json({ success: false, message: "Finance Team can only upload to the Financial Records category." });
      }
    }
    const payload = { ...req.body, ...extractFileFields(req.file) };
    const data    = await archivesService.createRecord(payload, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateRecord = async (req, res, next) => {
  try {
    // Finance Team can only upload to "Financial Records" category
    if (req.user?.roleName === "Finance Team" && req.body.category_id) {
      const { ArchiveCategory } = require("../models");
      const cat = await ArchiveCategory.findByPk(req.body.category_id);
      if (!cat || cat.name !== "Financial Records") {
        return res.status(403).json({ success: false, message: "Finance Team can only upload to the Financial Records category." });
      }
    }
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

exports.archiveRecord = async (req, res, next) => {
  try {
    // Only System Admin can move records into the retained archive.
    if (req.user?.roleName !== "System Admin") {
      return res.status(403).json({ success: false, message: "Only System Admin can archive records." });
    }
    const data = await archivesService.archiveRecord(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// Backward-compatible handler name for old clients using DELETE /:id.
exports.deleteRecord = exports.archiveRecord;

exports.restoreRecord = async (req, res, next) => {
  try {
    if (req.user?.roleName !== "System Admin") {
      return res.status(403).json({ success: false, message: "Only System Admin can restore archive records." });
    }
    const data = await archivesService.restoreRecord(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Versions ─────────────────────────────────────────────────
exports.getVersions = async (req, res, next) => {
  try {
    const data = await archivesService.getVersions(req.params.id, req.user?.roleName);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.downloadRecord = async (req, res, next) => {
  try {
    const { storageKey } = await archivesService.getDownloadFile(
      req.params.id,
      null,
      req.user?.roleName,
    );
    await archivesService.logAccess(req.params.id, req.user.userId, "download", req.user?.roleName);
    await uploadStorage.sendStoredUpload(storageKey, res);
  } catch (err) {
    if (!res.headersSent) next(err);
    else res.destroy(err);
  }
};

exports.downloadVersion = async (req, res, next) => {
  try {
    const { storageKey } = await archivesService.getDownloadFile(
      req.params.id,
      req.params.versionId,
      req.user?.roleName,
    );
    await archivesService.logAccess(req.params.id, req.user.userId, "download", req.user?.roleName);
    await uploadStorage.sendStoredUpload(storageKey, res);
  } catch (err) {
    if (!res.headersSent) next(err);
    else res.destroy(err);
  }
};

// ── Access Logs ──────────────────────────────────────────────
exports.logView = async (req, res, next) => {
  try {
    const data = await archivesService.logAccess(req.params.id, req.user.userId, "view", req.user?.roleName);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.logDownload = async (req, res, next) => {
  try {
    const data = await archivesService.logAccess(req.params.id, req.user.userId, "download", req.user?.roleName);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getAccessLogs = async (req, res, next) => {
  try {
    const data = await archivesService.getAccessLogs(req.params.id, req.user?.roleName);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Categories ───────────────────────────────────────────────
exports.getAllCategories = async (req, res, next) => {
  try {
    const data = await archivesService.getAllCategories(req.user?.roleName);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const data = await archivesService.getCategoryById(req.params.id, req.user?.roleName);
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
