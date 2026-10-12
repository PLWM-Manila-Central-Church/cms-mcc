"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/archives.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const { archiveUpload, requireDurableUploadStorage } = require("../middlewares/upload-s3");
const validateQuery = require("../middlewares/validateQuery");
const { getArchivesQuerySchema } = require("../validators/archives.validator");

// ── Categories (MUST be before /:id) ─────────────────────────
router.get("/categories",        auth, authorize("archives", "read"),   ctrl.getAllCategories);
router.get("/categories/:id",    auth, authorize("archives", "read"),   ctrl.getCategoryById);
router.post("/categories",       auth, authorize("archives", "update"), ctrl.createCategory);
router.put("/categories/:id",    auth, authorize("archives", "update"), ctrl.updateCategory);
router.delete("/categories/:id", auth, authorize("archives", "delete"), ctrl.deleteCategory);

// ── Records ──────────────────────────────────────────────────
router.get("/",    auth, authorize("archives", "read"), validateQuery(getArchivesQuerySchema), ctrl.getAllRecords);
router.get("/:id", auth, authorize("archives", "read"),   ctrl.getRecordById);

router.post("/",   auth, authorize("archives", "create"), requireDurableUploadStorage, archiveUpload.single("file"), ctrl.createRecord);
router.put("/:id", auth, authorize("archives", "update"), requireDurableUploadStorage, archiveUpload.single("file"), ctrl.updateRecord);

router.patch("/:id/approve", auth, authorize("archives", "update"), ctrl.approveRecord);
router.delete("/:id",        auth, authorize("archives", "delete"), ctrl.deleteRecord);

// ── Versions ─────────────────────────────────────────────────
router.get("/:id/versions", auth, authorize("archives", "read"), ctrl.getVersions);
router.get("/:id/file", auth, authorize("archives", "read"), ctrl.downloadRecord);
router.get("/:id/versions/:versionId/file", auth, authorize("archives", "read"), ctrl.downloadVersion);

// ── Access Logs ──────────────────────────────────────────────
router.post("/:id/view",       auth, authorize("archives", "read"), ctrl.logView);
router.post("/:id/download",   auth, authorize("archives", "read"), ctrl.logDownload);
router.get("/:id/access-logs", auth, authorize("archives", "read"), authorize("archives", "update"), ctrl.getAccessLogs);
router.get("/:id/logs",        auth, authorize("archives", "read"), authorize("archives", "update"), ctrl.getAccessLogs);

module.exports = router;
