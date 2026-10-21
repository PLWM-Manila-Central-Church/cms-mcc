"use strict";

const financeService = require("../services/finance.service");
const AppError       = require("../helpers/AppError");
const uploadStorage  = require("../middlewares/upload-s3");
const logger         = require("../helpers/logger");

const parseAttachmentOwnerId = (value) => {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw AppError.badRequest("VALIDATION", "The attachment record ID is invalid");
  }
  return id;
};

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
    const result = await financeService.updateRecord(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.archiveRecord = async (req, res, next) => {
  try {
    const result = await financeService.archiveRecord(
      req.params.id,
      req.user.userId,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
exports.deleteRecord = exports.archiveRecord;

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

exports.getMyGiving = async (req, res, next) => {
  try {
    const result = await financeService.getMyGiving(req.user.memberId, req.query);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.searchGivingMembers = async (req, res, next) => {
  try {
    const result = await financeService.searchGivingMembers(req.query);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getBalance = async (req, res, next) => {
  try {
    const result = await financeService.getBalance(req.query);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── 1. FUNDS CONTROLLERS ──────────────────────────────────────
exports.getAllFunds = async (req, res, next) => {
  try {
    const result = await financeService.getAllFunds();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getFundById = async (req, res, next) => {
  try {
    const result = await financeService.getFundById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.createFund = async (req, res, next) => {
  try {
    const result = await financeService.createFund(req.body, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateFund = async (req, res, next) => {
  try {
    const result = await financeService.updateFund(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.deleteFund = async (req, res, next) => {
  try {
    const result = await financeService.deleteFund(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── 2. ACCOUNTS CONTROLLERS ───────────────────────────────────
exports.getAllAccounts = async (req, res, next) => {
  try {
    const result = await financeService.getAllAccounts();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getAccountById = async (req, res, next) => {
  try {
    const result = await financeService.getAccountById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.createAccount = async (req, res, next) => {
  try {
    const result = await financeService.createAccount(req.body, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateAccount = async (req, res, next) => {
  try {
    const result = await financeService.updateAccount(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.deleteAccount = async (req, res, next) => {
  try {
    const result = await financeService.deleteAccount(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── 3. EXPENSE CATEGORIES CONTROLLERS ─────────────────────────
exports.getAllExpenseCategories = async (req, res, next) => {
  try {
    const result = await financeService.getAllExpenseCategories();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getExpenseCategoryById = async (req, res, next) => {
  try {
    const result = await financeService.getExpenseCategoryById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.createExpenseCategory = async (req, res, next) => {
  try {
    const result = await financeService.createExpenseCategory(req.body, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateExpenseCategory = async (req, res, next) => {
  try {
    const result = await financeService.updateExpenseCategory(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.deleteExpenseCategory = async (req, res, next) => {
  try {
    const result = await financeService.deleteExpenseCategory(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── 4. PAYMENT METHODS CONTROLLERS ────────────────────────────
exports.getAllPaymentMethods = async (req, res, next) => {
  try {
    const result = await financeService.getAllPaymentMethods();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── 5. EXPENSES CONTROLLERS ───────────────────────────────────
exports.getAllExpenses = async (req, res, next) => {
  try {
    const result = await financeService.getAllExpenses(req.query);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getExpenseSummary = async (req, res, next) => {
  try {
    const result = await financeService.getExpenseSummary(req.query);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getExpenseById = async (req, res, next) => {
  try {
    const result = await financeService.getExpenseById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.createExpense = async (req, res, next) => {
  try {
    const result = await financeService.createExpense(req.body, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateExpense = async (req, res, next) => {
  try {
    const result = await financeService.updateExpense(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.deleteExpense = async (req, res, next) => {
  try {
    const result = await financeService.deleteExpense(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── 6. ATTACHMENTS CONTROLLERS ────────────────────────────────
exports.uploadAttachment = async (req, res, next) => {
  let storageKey = null;
  let attachmentSaved = false;
  try {
    if (!req.file) throw AppError.badRequest("VALIDATION", "No receipt file uploaded");

    const { income_id, expense_id } = req.body;
    // S3 uploads expose the object key on req.file.key; disk uploads on req.file.filename
    storageKey = req.file.key || `receipts/${req.file.filename}`;
    const relativePath = uploadStorage.getFileUrl(storageKey);
    const result = await financeService.createAttachment({
      file_name: req.file.originalname,
      file_path: relativePath,
      income_id: parseAttachmentOwnerId(income_id),
      expense_id: parseAttachmentOwnerId(expense_id),
    }, req.user.userId);

    attachmentSaved = true;
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    if (storageKey && !attachmentSaved) {
      try {
        await uploadStorage.deleteStoredFile(storageKey);
      } catch (cleanupError) {
        logger.error(cleanupError, "Could not remove an unlinked receipt upload");
      }
    }
    next(err);
  }
};

exports.downloadAttachment = async (req, res, next) => {
  try {
    const key = req.user.roleName === "Member"
      ? await financeService.getMemberAttachmentDownloadKey(req.params.id, req.user.memberId)
      : await financeService.getAttachmentDownloadKey(req.params.id);
    await uploadStorage.sendStoredUpload(key, res);
  } catch (err) { next(err); }
};

exports.archiveAttachment = async (req, res, next) => {
  try {
    const result = await financeService.archiveAttachment(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
exports.deleteAttachment = exports.archiveAttachment;
