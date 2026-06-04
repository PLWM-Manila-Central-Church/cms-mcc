"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/finance.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const multer  = require("multer");
const path    = require("path");
const fs      = require("fs");
const logger  = require("../helpers/logger");
const crypto    = require("crypto");

const {
  createRecordSchema, updateRecordSchema,
  createCategorySchema, updateCategorySchema,
  createFundSchema, updateFundSchema,
  createAccountSchema, updateAccountSchema,
  createExpenseCategorySchema, updateExpenseCategorySchema,
  createExpenseSchema, updateExpenseSchema,
} = require("../validators/finance.validator");

// Multer Storage config for Expense Receipt Attachments
const RECEIPTS_DIR = path.join(__dirname, "../../uploads/receipts");
if (!fs.existsSync(RECEIPTS_DIR)) {
  fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
}

const ALLOWED_RECEIPT_EXT = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_RECEIPT_MIME = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
];

const receiptStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, RECEIPTS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${unique}${ext}`);
  },
});

const receiptFileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_RECEIPT_EXT.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: ${ALLOWED_RECEIPT_EXT.join(", ")}`), false);
  }
};

const receiptUpload = multer({
  storage: receiptStorage,
  fileFilter: receiptFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file limit
});

// Verify receipt MIME type from actual file content (magic bytes)
const verifyReceiptMime = async (req, res, next) => {
  if (!req.file) return next();

  try {
    const { fileTypeFromBuffer } = await import("file-type");
    const fs = require("fs");
    const buffer = fs.readFileSync(req.file.path).slice(0, 4100);
    const type = await fileTypeFromBuffer(buffer);

    if (!type || !ALLOWED_RECEIPT_MIME.includes(type.mime)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ message: "Invalid file content type." });
    }

    next();
  } catch (err) {
    logger.warn(err, "Receipt MIME check failed open");
    next();
  }
};

// ── Financial Records (Income / Tithes / Offerings) ──────────
router.get("/my-giving",    auth, authorize("finance", "read"), ctrl.getMyGiving);
router.get("/balance",      auth, authorize("finance", "read"),   ctrl.getBalance);
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

// ── Funds Endpoints ──────────────────────────────────────────
router.get("/funds",        auth, authorize("finance", "read"),   ctrl.getAllFunds);
router.get("/funds/:id",    auth, authorize("finance", "read"),   ctrl.getFundById);
router.post("/funds",       auth, authorize("finance", "create"), validate(createFundSchema), ctrl.createFund);
router.put("/funds/:id",    auth, authorize("finance", "update"), validate(updateFundSchema), ctrl.updateFund);
router.delete("/funds/:id", auth, authorize("finance", "delete"), ctrl.deleteFund);

// ── Accounts Endpoints ───────────────────────────────────────
router.get("/accounts",        auth, authorize("finance", "read"),   ctrl.getAllAccounts);
router.get("/accounts/:id",    auth, authorize("finance", "read"),   ctrl.getAccountById);
router.post("/accounts",       auth, authorize("finance", "create"), validate(createAccountSchema), ctrl.createAccount);
router.put("/accounts/:id",    auth, authorize("finance", "update"), validate(updateAccountSchema), ctrl.updateAccount);
router.delete("/accounts/:id", auth, authorize("finance", "delete"), ctrl.deleteAccount);

// ── Expense Categories Endpoints ─────────────────────────────
router.get("/expense-categories",        auth, authorize("finance", "read"),   ctrl.getAllExpenseCategories);
router.get("/expense-categories/:id",    auth, authorize("finance", "read"),   ctrl.getExpenseCategoryById);
router.post("/expense-categories",       auth, authorize("finance", "create"), validate(createExpenseCategorySchema), ctrl.createExpenseCategory);
router.put("/expense-categories/:id",    auth, authorize("finance", "update"), validate(updateExpenseCategorySchema), ctrl.updateExpenseCategory);

// ── Payment Methods Endpoints ────────────────────────────────
router.get("/payment-methods", auth, authorize("finance", "read"), ctrl.getAllPaymentMethods);

// ── Expenses Endpoints ────────────────────────────────────────
router.get("/expenses",         auth, authorize("finance", "read"),   ctrl.getAllExpenses);
router.get("/expenses/summary", auth, authorize("finance", "read"),   ctrl.getExpenseSummary);
router.get("/expenses/:id",     auth, authorize("finance", "read"),   ctrl.getExpenseById);
router.post("/expenses",        auth, authorize("finance", "create"), validate(createExpenseSchema), ctrl.createExpense);
router.put("/expenses/:id",     auth, authorize("finance", "update"), validate(updateExpenseSchema), ctrl.updateExpense);
router.delete("/expenses/:id",  auth, authorize("finance", "delete"), ctrl.deleteExpense);

// ── Attachments Endpoints ────────────────────────────────────
router.post("/attachments/upload", auth, authorize("finance", "create"), receiptUpload.single("file"), verifyReceiptMime, ctrl.uploadAttachment);
router.delete("/attachments/:id",  auth, authorize("finance", "delete"), ctrl.deleteAttachment);

// ── Root aliases (frontend compatibility) ────────────────────
router.get("/",    auth, authorize("finance", "read"),   ctrl.getAllRecords);
router.get("/:id", auth, authorize("finance", "read"),   ctrl.getRecordById);
router.post("/",   auth, authorize("finance", "create"), validate(createRecordSchema), ctrl.createRecord);
router.put("/:id", auth, authorize("finance", "update"), validate(updateRecordSchema), ctrl.updateRecord);
router.delete("/:id", auth, authorize("finance", "delete"), ctrl.deleteRecord);

module.exports = router;
