"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/finance.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const {
  createRecordSchema, updateRecordSchema,
  createCategorySchema, updateCategorySchema,
} = require("../validators/finance.validator");

// ── Financial Records ────────────────────────────────────────
router.get("/my-giving",    auth, ctrl.getMyGiving);
router.get("/summary",      auth, authorize("finance", "read"),   ctrl.getSummary);
router.get("/records",      auth, authorize("finance", "read"),   ctrl.getAllRecords);
router.get("/records/:id",  auth, authorize("finance", "read"),   ctrl.getRecordById);
router.post("/records",     auth, authorize("finance", "create"), validate(createRecordSchema), ctrl.createRecord);
router.put("/records/:id",  auth, authorize("finance", "update"), validate(updateRecordSchema), ctrl.updateRecord);
router.delete("/records/:id", auth, authorize("finance", "delete"), ctrl.deleteRecord);

// ── Financial Categories ─────────────────────────────────────
router.get("/categories",        auth, authorize("finance", "read"),   ctrl.getAllCategories);
router.get("/categories/:id",    auth, authorize("finance", "read"),   ctrl.getCategoryById);
router.post("/categories",       auth, authorize("finance", "create"), validate(createCategorySchema), ctrl.createCategory);
router.put("/categories/:id",    auth, authorize("finance", "update"), validate(updateCategorySchema), ctrl.updateCategory);
router.delete("/categories/:id", auth, authorize("finance", "delete"), ctrl.deleteCategory);

// ── Root aliases (frontend compatibility) ────────────────────
router.get("/",    auth, authorize("finance", "read"),   ctrl.getAllRecords);
router.get("/:id", auth, authorize("finance", "read"),   ctrl.getRecordById);
router.post("/",   auth, authorize("finance", "create"), validate(createRecordSchema), ctrl.createRecord);
router.put("/:id", auth, authorize("finance", "update"), validate(updateRecordSchema), ctrl.updateRecord);
router.delete("/:id", auth, authorize("finance", "delete"), ctrl.deleteRecord);

module.exports = router;
