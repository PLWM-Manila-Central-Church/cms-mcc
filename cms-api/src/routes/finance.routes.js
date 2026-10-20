"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/finance.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const validateQuery = require("../middlewares/validateQuery");
const { receiptUpload, requireDurableUploadStorage } = require("../middlewares/upload-s3");

const {
  createRecordSchema, updateRecordSchema,
  createCategorySchema, updateCategorySchema,
  getRecordsQuerySchema, searchGivingMembersQuerySchema,
} = require("../validators/finance.validator");

// ── Financial Records (Income / Tithes / Offerings) ──────────
router.get("/my-giving",    auth, authorize("finance", "read"), ctrl.getMyGiving);
router.get("/members/search", auth, authorize("finance", "create"), validateQuery(searchGivingMembersQuerySchema), ctrl.searchGivingMembers);
router.get("/summary",      auth, authorize("finance", "read"), validateQuery(getRecordsQuerySchema), ctrl.getSummary);
router.get("/records",      auth, authorize("finance", "read"), validateQuery(getRecordsQuerySchema), ctrl.getAllRecords);
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

// Retired finance paths are deliberately closed, including old bookmarks/API clients.
router.use(["/expenses", "/expense-categories", "/funds", "/accounts", "/balance"],
  auth, authorize("finance", "read"), (_req, res) => res.status(410).json({
    success: false, code: "FEATURE_RETIRED",
    message: "Finance records received income only. Expense recording and expenditure setup are no longer available.",
  }));

// ── Payment Methods Endpoints ────────────────────────────────
router.get("/payment-methods", auth, authorize("finance", "read"), ctrl.getAllPaymentMethods);

// ── Attachments Endpoints ────────────────────────────────────
const authorizeAttachmentDownload = (req, res, next) => {
  if (req.user?.roleName === "Member") return next();
  return authorize("finance", "read")(req, res, next);
};

router.post("/attachments/upload", auth, authorize("finance", "create"), requireDurableUploadStorage, receiptUpload.single("file"), ctrl.uploadAttachment);
router.get("/attachments/:id/download", auth, authorizeAttachmentDownload, ctrl.downloadAttachment);
router.delete("/attachments/:id",  auth, authorize("finance", "delete"), ctrl.deleteAttachment);

// ── Root aliases (frontend compatibility) ────────────────────
router.get("/",    auth, authorize("finance", "read"),   ctrl.getAllRecords);
router.get("/:id", auth, authorize("finance", "read"),   ctrl.getRecordById);
router.post("/",   auth, authorize("finance", "create"), validate(createRecordSchema), ctrl.createRecord);
router.put("/:id", auth, authorize("finance", "update"), validate(updateRecordSchema), ctrl.updateRecord);
router.delete("/:id", auth, authorize("finance", "delete"), ctrl.deleteRecord);

module.exports = router;
