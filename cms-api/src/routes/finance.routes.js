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
  createFundSchema, updateFundSchema,
  createAccountSchema, updateAccountSchema,
  createExpenseCategorySchema, updateExpenseCategorySchema,
  createExpenseSchema, updateExpenseSchema,
} = require("../validators/finance.validator");

// ── Financial Records (Income / Tithes / Offerings) ──────────
router.get("/my-giving",    auth, authorize("finance", "read"), ctrl.getMyGiving);
router.get("/members/search", auth, authorize("finance", "create"), validateQuery(searchGivingMembersQuerySchema), ctrl.searchGivingMembers);
router.get("/summary",      auth, authorize("finance", "read"), validateQuery(getRecordsQuerySchema), ctrl.getSummary);
router.get("/records",      auth, authorize("finance", "read"), validateQuery(getRecordsQuerySchema), ctrl.getAllRecords);
router.get("/records/:id",  auth, authorize("finance", "read"),   ctrl.getRecordById);
router.post("/records",     auth, authorize("finance", "create"), validate(createRecordSchema), ctrl.createRecord);
router.put("/records/:id",  auth, authorize("finance", "update"), validate(updateRecordSchema), ctrl.updateRecord);
router.patch("/records/:id/archive", auth, authorize("finance", "archive"), ctrl.archiveRecord);

// ── Financial Categories ─────────────────────────────────────
router.get("/categories",        auth, authorize("finance", "read"),   ctrl.getAllCategories);
router.get("/categories/:id",    auth, authorize("finance", "read"),   ctrl.getCategoryById);
router.post("/categories",       auth, authorize("finance", "create"), validate(createCategorySchema), ctrl.createCategory);
router.put("/categories/:id",    auth, authorize("finance", "update"), validate(updateCategorySchema), ctrl.updateCategory);

// Expense setup and records. Account is configured on each category, then
// derived by the API from the selected category when a user records an expense.
router.get("/funds", auth, authorize("finance", "read"), ctrl.getAllFunds);
router.get("/funds/:id", auth, authorize("finance", "read"), ctrl.getFundById);
router.post("/funds", auth, authorize("finance", "create"), validate(createFundSchema), ctrl.createFund);
router.put("/funds/:id", auth, authorize("finance", "update"), validate(updateFundSchema), ctrl.updateFund);
router.patch("/funds/:id/archive", auth, authorize("finance", "archive"), ctrl.archiveFund);

router.get("/accounts", auth, authorize("finance", "read"), ctrl.getAllAccounts);
router.get("/accounts/:id", auth, authorize("finance", "read"), ctrl.getAccountById);
router.post("/accounts", auth, authorize("finance", "create"), validate(createAccountSchema), ctrl.createAccount);
router.put("/accounts/:id", auth, authorize("finance", "update"), validate(updateAccountSchema), ctrl.updateAccount);
router.patch("/accounts/:id/archive", auth, authorize("finance", "archive"), ctrl.archiveAccount);

router.get("/expense-categories", auth, authorize("finance", "read"), ctrl.getAllExpenseCategories);
router.get("/expense-categories/:id", auth, authorize("finance", "read"), ctrl.getExpenseCategoryById);
router.post("/expense-categories", auth, authorize("finance", "create"), validate(createExpenseCategorySchema), ctrl.createExpenseCategory);
router.put("/expense-categories/:id", auth, authorize("finance", "update"), validate(updateExpenseCategorySchema), ctrl.updateExpenseCategory);
router.patch("/expense-categories/:id/archive", auth, authorize("finance", "archive"), ctrl.archiveExpenseCategory);

router.get("/balance", auth, authorize("finance", "read"), validateQuery(getRecordsQuerySchema), ctrl.getBalance);
router.get("/expenses/summary", auth, authorize("finance", "read"), validateQuery(getRecordsQuerySchema), ctrl.getExpenseSummary);
router.get("/expenses", auth, authorize("finance", "read"), validateQuery(getRecordsQuerySchema), ctrl.getAllExpenses);
router.get("/expenses/:id", auth, authorize("finance", "read"), ctrl.getExpenseById);
router.post("/expenses", auth, authorize("finance", "create"), validate(createExpenseSchema), ctrl.createExpense);
router.put("/expenses/:id", auth, authorize("finance", "update"), validate(updateExpenseSchema), ctrl.updateExpense);
router.patch("/expenses/:id/archive", auth, authorize("finance", "archive"), ctrl.archiveExpense);

// ── Payment Methods Endpoints ────────────────────────────────
router.get("/payment-methods", auth, authorize("finance", "read"), ctrl.getAllPaymentMethods);

// ── Attachments Endpoints ────────────────────────────────────
const authorizeAttachmentDownload = (req, res, next) => {
  if (req.user?.roleName === "Member") return next();
  return authorize("finance", "read")(req, res, next);
};

router.post("/attachments/upload", auth, authorize("finance", "create"), requireDurableUploadStorage, receiptUpload.single("file"), ctrl.uploadAttachment);
router.get("/attachments/:id/download", auth, authorizeAttachmentDownload, ctrl.downloadAttachment);
router.patch("/attachments/:id/archive", auth, authorize("finance", "archive"), ctrl.archiveAttachment);

// ── Root aliases (frontend compatibility) ────────────────────
router.get("/",    auth, authorize("finance", "read"),   ctrl.getAllRecords);
router.get("/:id", auth, authorize("finance", "read"),   ctrl.getRecordById);
router.post("/",   auth, authorize("finance", "create"), validate(createRecordSchema), ctrl.createRecord);
router.put("/:id", auth, authorize("finance", "update"), validate(updateRecordSchema), ctrl.updateRecord);

module.exports = router;
