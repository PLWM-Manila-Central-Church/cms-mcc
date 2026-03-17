"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/archives.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const upload    = require("../middlewares/upload"); // FIX BUG 1: multer file parser

// ── Categories (MUST be before /:id) ─────────────────────────
router.get("/categories",        auth, authorize("archives", "read"),   ctrl.getAllCategories);
router.get("/categories/:id",    auth, authorize("archives", "read"),   ctrl.getCategoryById);
router.post("/categories",       auth, authorize("archives", "create"), ctrl.createCategory);
router.put("/categories/:id",    auth, authorize("archives", "update"), ctrl.updateCategory);
router.delete("/categories/:id", auth, authorize("archives", "delete"), ctrl.deleteCategory);

// ── Records ──────────────────────────────────────────────────
router.get("/",    auth, authorize("archives", "read"),   ctrl.getAllRecords);
router.get("/:id", auth, authorize("archives", "read"),   ctrl.getRecordById);

// upload.single("file") parses multipart/form-data and populates req.file
router.post("/",   auth, authorize("archives", "create"), upload.single("file"), ctrl.createRecord);
router.put("/:id", auth, authorize("archives", "update"), upload.single("file"), ctrl.updateRecord);

router.patch("/:id/approve", auth, authorize("archives", "update"), ctrl.approveRecord);
router.delete("/:id",        auth, authorize("archives", "delete"), ctrl.deleteRecord);

// ── Versions ─────────────────────────────────────────────────
router.get("/:id/versions", auth, authorize("archives", "read"), ctrl.getVersions);

// ── Access Logs ──────────────────────────────────────────────
router.post("/:id/view",       auth, authorize("archives", "read"), ctrl.logView);
router.post("/:id/download",   auth, authorize("archives", "read"), ctrl.logDownload);
router.get("/:id/access-logs", auth, authorize("archives", "read"), ctrl.getAccessLogs);
router.get("/:id/logs",        auth, authorize("archives", "read"), ctrl.getAccessLogs);

module.exports = router;
