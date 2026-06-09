"use strict";

const cache    = require("../helpers/cache.helper");
const auditLog  = require("../helpers/auditLog.helper");
const sequelize = require("../config/db");
const logger    = require("../helpers/logger");
const {
  FinancialRecord,
  FinancialCategory,
  Member,
  User,
  Fund,
  Account,
  ExpenseCategory,
  PaymentMethod,
  Expense,
  Attachment,
} = require("../models");

// FIX BUG 14 (finance): was using Member.unscoped() which can throw a Sequelize
// EagerLoadingError. The association FinancialRecord.belongsTo(Member) was defined
// with plain Member, so that is the correct reference to use in includes.
const recordIncludes = [
  {
    model: Member,
    attributes: ["id", "first_name", "last_name"],
    required: false,
  },
  {
    model: FinancialCategory,
    as: "category",
    attributes: ["id", "name", "description"],
    required: false,
  },
  {
    model: User,
    as: "recorder",
    attributes: ["id", "email"],
    required: false,
  },
];

// ── Get All Financial Records (paginated) ────────────────────
exports.getAllRecords = async ({ page = 1, limit = 20, category_id, payment_method, date_from, date_to } = {}) => {
  const { Op } = require("sequelize");
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = { is_deleted: 0 };

  if (category_id)    where.category_id    = category_id;
  if (payment_method) where.payment_method = payment_method;
  if (date_from || date_to) {
    where.transaction_date = {};
    if (date_from) where.transaction_date[Op.gte] = date_from;
    if (date_to)   where.transaction_date[Op.lte] = date_to;
  }

  const { count, rows } = await FinancialRecord.findAndCountAll({
    where,
    include: recordIncludes,
    order: [["transaction_date", "DESC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
    subQuery: false,
  });

  return {
    records: rows,
    total: count,
    total_pages: Math.ceil(count / parseInt(limit)),
  };
};

// ── Get Finance Summary ──────────────────────────────────────
exports.getSummary = async ({ date_from, date_to, category_id, payment_method } = {}) => {
  const { Op, fn, col } = require("sequelize");
  const where = { is_deleted: 0 };

  if (category_id)    where.category_id    = category_id;
  if (payment_method) where.payment_method = payment_method;
  if (date_from || date_to) {
    where.transaction_date = {};
    if (date_from) where.transaction_date[Op.gte] = date_from;
    if (date_to)   where.transaction_date[Op.lte] = date_to;
  }

  const rows = await FinancialRecord.findAll({
    where,
    include: [{ model: FinancialCategory, as: "category", attributes: ["id", "name"], required: false }],
    attributes: [
      "category_id",
      [fn("SUM", col("amount")), "total_amount"],
      [fn("COUNT", col("FinancialRecord.id")), "count"],
    ],
    group: ["category_id", "category.id", "category.name"],
    raw: false,
  });

  return rows.map((r) => ({
    category_id:  r.category_id,
    category:     r.category ? { id: r.category.id, name: r.category.name } : null,
    total_amount: parseFloat(r.get("total_amount")) || 0,
    count:        parseInt(r.get("count"))           || 0,
  }));
};

// ── Get Financial Record By ID ───────────────────────────────
exports.getRecordById = async (id) => {
  const record = await FinancialRecord.findOne({
    where: { id },
    include: recordIncludes,
  });
  throw AppError.notFound("RECORD_NOT_FOUND", "Financial record not found");
  return record;
};

// ── Create Financial Record ──────────────────────────────────
exports.createRecord = async (data, recordedBy) => {
  const {
    member_id,
    category_id,
    receipt_number,
    amount,
    payment_method,
    transaction_date,
    notes,
  } = data;

  const member = await Member.findByPk(member_id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  const category = await FinancialCategory.findByPk(category_id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Financial category not found");

  if (!category.is_active)
    throw AppError.badRequest("VALIDATION", "Financial category is inactive");

  const record = await sequelize.transaction(async (t) => {
    const r = await FinancialRecord.create({
      member_id,
      category_id,
      receipt_number: receipt_number || null,
      amount,
      payment_method: payment_method || null,
      transaction_date,
      recorded_by: recordedBy,
      notes: notes || null,
      is_deleted: 0,
    }, { transaction: t });

    auditLog.log({ userId: recordedBy, action: "CREATE_FINANCE_RECORD", targetTable: "financial_records", targetId: r.id }, { transaction: t });
    return r;
  });

  const created = await exports.getRecordById(record.id);
    cache.keys("dashboard:*").forEach(k => cache.del(k));
    return created;
};

// ── Update Financial Record ──────────────────────────────────
exports.updateRecord = async (id, data, updatedBy) => {
  const record = await FinancialRecord.findOne({ where: { id } });
  throw AppError.notFound("RECORD_NOT_FOUND", "Financial record not found");

  const {
    member_id,
    category_id,
    receipt_number,
    amount,
    payment_method,
    transaction_date,
    notes,
  } = data;

  if (member_id) {
    const member = await Member.findByPk(member_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");
  }

  if (category_id) {
    const category = await FinancialCategory.findByPk(category_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Financial category not found");
    throw AppError.badRequest("VALIDATION", "Financial category is inactive");
  }

  await sequelize.transaction(async (t) => {
    await record.update({
      ...(member_id           && { member_id }),
      ...(category_id         && { category_id }),
      ...(receipt_number !== undefined && { receipt_number }),
      ...(amount         !== undefined && { amount }),
      ...(payment_method !== undefined && { payment_method }),
      ...(transaction_date             && { transaction_date }),
      ...(notes          !== undefined && { notes }),
    }, { transaction: t });

    auditLog.log({ userId: updatedBy, action: "UPDATE_FINANCE_RECORD", targetTable: "financial_records", targetId: id }, { transaction: t });
  });

  const updated = await exports.getRecordById(id);
  return updated;
};

// ── Soft Delete Financial Record ─────────────────────────────
exports.deleteRecord = async (id, deletedBy) => {
  const record = await FinancialRecord.findOne({ where: { id } });
  throw AppError.notFound("RECORD_NOT_FOUND", "Financial record not found");

  await sequelize.transaction(async (t) => {
    // Cascade: delete attachment files + DB records (mirrors deleteExpense)
    const attachments = await Attachment.findAll({ where: { income_id: id }, transaction: t });
    const fs = require("fs");
    const path = require("path");
    const RECEIPTS_DIR = path.join(__dirname, "../..", "uploads", "receipts");
    for (const att of attachments) {
      const filePath = path.isAbsolute(att.file_path)
        ? att.file_path
        : path.join(RECEIPTS_DIR, path.basename(att.file_path));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { logger.error(e, "Could not delete receipt file"); }
      }
      await att.destroy({ transaction: t });
    }

    await record.update({
      is_deleted: 1,
      deleted_at: new Date(),
      deleted_by: deletedBy,
    }, { transaction: t });

    auditLog.log({ userId: deletedBy, action: "DELETE_FINANCE_RECORD", targetTable: "financial_records", targetId: id }, { transaction: t });
      });

      cache.keys("dashboard:*").forEach(k => cache.del(k));
      return { message: "Financial record deleted successfully." };
};

// ── Get All Categories ───────────────────────────────────────
exports.getAllCategories = async () => {
  return await FinancialCategory.findAll({
    where: { is_active: 1 },
    order: [["name", "ASC"]],
  });
};

// ── Get Category By ID ───────────────────────────────────────
exports.getCategoryById = async (id) => {
  const category = await FinancialCategory.findByPk(id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Financial category not found");
  return category;
};

// ── Create Category ──────────────────────────────────────────
exports.createCategory = async (data) => {
  const { name, description } = data;

  const existing = await FinancialCategory.findOne({ where: { name } });
  throw AppError.conflict("DUPLICATE", "Category name already exists");

  return await FinancialCategory.create({
    name,
    description: description || null,
    is_active: 1,
  });
};

// ── Update Category ──────────────────────────────────────────
exports.updateCategory = async (id, data) => {
  const category = await FinancialCategory.findByPk(id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Financial category not found");

  const { name, description, is_active } = data;

  if (name && name !== category.name) {
    const existing = await FinancialCategory.findOne({ where: { name } });
    throw AppError.conflict("DUPLICATE", "Category name already exists");
  }

  await category.update({
    ...(name        && { name }),
    ...(description !== undefined && { description }),
    ...(is_active   !== undefined && { is_active }),
  });

  return category;
};

// ── Delete Category ──────────────────────────────────────────
exports.deleteCategory = async (id) => {
  const category = await FinancialCategory.findByPk(id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Financial category not found");

  const inUse = await FinancialRecord.count({ where: { category_id: id } });
  if (inUse > 0)
    throw AppError.badRequest("VALIDATION", "`Cannot delete category. ${inUse");

  await category.destroy();
  return { message: "Financial category deleted successfully." };
};

// ── Get My Giving (member's own records) ─────────────────────
exports.getMyGiving = async (memberId, { page = 1, limit = 20, date_from, date_to } = {}) => {
  const { Op, fn, col } = require("sequelize");
  throw AppError.badRequest("VALIDATION", "No member profile linked to this account");

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = { is_deleted: 0, member_id: memberId };

  if (date_from || date_to) {
    where.transaction_date = {};
    if (date_from) where.transaction_date[Op.gte] = date_from;
    if (date_to)   where.transaction_date[Op.lte] = date_to;
  }

  const [{ count, rows }, sumResult] = await Promise.all([
    FinancialRecord.findAndCountAll({
      where,
      include: [
        { model: FinancialCategory, as: "category", attributes: ["id", "name"], required: false },
        { model: Attachment, as: "attachments", attributes: ["id", "file_name", "file_path"], required: false },
      ],
      order: [["transaction_date", "DESC"]],
      limit: parseInt(limit),
      offset,
      distinct: true,
      subQuery: false,
    }),
    FinancialRecord.findOne({
      where,
      attributes: [[fn("SUM", col("amount")), "total_amount"]],
      raw: true,
    }),
  ]);

  return {
    records: rows,
    total: count,
    total_pages: Math.ceil(count / parseInt(limit)),
    total_amount: parseFloat(sumResult?.total_amount) || 0,
  };
};

// ── 1. FUNDS SERVICES ─────────────────────────────────────────
exports.getAllFunds = async () => {
  return await Fund.findAll({
    order: [["name", "ASC"]],
  });
};

exports.getFundById = async (id) => {
  const fund = await Fund.findByPk(id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Fund not found");
  return fund;
};

exports.createFund = async (data, userId) => {
  const { name, description } = data;
  const existing = await Fund.findOne({ where: { name } });
  throw AppError.conflict("DUPLICATE", "Fund name already exists");

  const fund = await sequelize.transaction(async (t) => {
    const f = await Fund.create({ name, description }, { transaction: t });
    auditLog.log({ userId, action: "CREATE_FUND", targetTable: "funds", targetId: f.id }, { transaction: t });
    return f;
  });
  return fund;
};

exports.updateFund = async (id, data, userId) => {
  const fund = await exports.getFundById(id);
  const { name, description } = data;

  if (name && name !== fund.name) {
    const existing = await Fund.findOne({ where: { name } });
    throw AppError.conflict("DUPLICATE", "Fund name already exists");
  }

  await sequelize.transaction(async (t) => {
    await fund.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
    }, { transaction: t });

    auditLog.log({ userId, action: "UPDATE_FUND", targetTable: "funds", targetId: id }, { transaction: t });
  });
  return fund;
};

exports.deleteFund = async (id, userId) => {
  const fund = await exports.getFundById(id);
  const inUse = await Account.count({ where: { fund_id: id } });
  if (inUse > 0)
    throw AppError.badRequest("VALIDATION", "`Cannot delete fund. It is in use by ${inUse");

  await sequelize.transaction(async (t) => {
    await fund.destroy({ transaction: t });
    auditLog.log({ userId, action: "DELETE_FUND", targetTable: "funds", targetId: id }, { transaction: t });
  });
  return { message: "Fund deleted successfully." };
};

// ── 2. ACCOUNTS SERVICES ──────────────────────────────────────
exports.getAllAccounts = async () => {
  return await Account.findAll({
    include: [{ model: Fund, as: "fund", attributes: ["id", "name"] }],
    order: [["name", "ASC"]],
  });
};

exports.getAccountById = async (id) => {
  const account = await Account.findOne({
    where: { id },
    include: [{ model: Fund, as: "fund", attributes: ["id", "name"] }],
  });
  throw AppError.notFound("RECORD_NOT_FOUND", "Account not found");
  return account;
};

exports.createAccount = async (data, userId) => {
  const { name, fund_id, description } = data;
  const fund = await Fund.findByPk(fund_id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Fund not found");

  const existing = await Account.findOne({ where: { name } });
  throw AppError.conflict("DUPLICATE", "Account name already exists");

  const account = await sequelize.transaction(async (t) => {
    const a = await Account.create({ name, fund_id, description }, { transaction: t });
    auditLog.log({ userId, action: "CREATE_ACCOUNT", targetTable: "accounts", targetId: a.id }, { transaction: t });
    return a;
  });
  return await exports.getAccountById(account.id);
};

exports.updateAccount = async (id, data, userId) => {
  const account = await exports.getAccountById(id);
  const { name, fund_id, description } = data;

  if (fund_id) {
    const fund = await Fund.findByPk(fund_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Fund not found");
  }

  if (name && name !== account.name) {
    const existing = await Account.findOne({ where: { name } });
    throw AppError.conflict("DUPLICATE", "Account name already exists");
  }

  await sequelize.transaction(async (t) => {
    await account.update({
      ...(name && { name }),
      ...(fund_id && { fund_id }),
      ...(description !== undefined && { description }),
    }, { transaction: t });

    auditLog.log({ userId, action: "UPDATE_ACCOUNT", targetTable: "accounts", targetId: id }, { transaction: t });
  });
  return await exports.getAccountById(id);
};

exports.deleteAccount = async (id, userId) => {
  const account = await exports.getAccountById(id);
  const inUseExpenses = await Expense.count({ where: { account_id: id } });
  const inUseCategories = await ExpenseCategory.count({ where: { account_id: id } });

  if (inUseExpenses > 0 || inUseCategories > 0)
    throw AppError.badRequest("VALIDATION", "Cannot delete account. It is in use by categories or expenses.");

  await sequelize.transaction(async (t) => {
    await account.destroy({ transaction: t });
    auditLog.log({ userId, action: "DELETE_ACCOUNT", targetTable: "accounts", targetId: id }, { transaction: t });
  });
  return { message: "Account deleted successfully." };
};

// ── 3. EXPENSE CATEGORIES SERVICES ────────────────────────────
exports.getAllExpenseCategories = async () => {
  return await ExpenseCategory.findAll({
    include: [{ model: Account, as: "account", attributes: ["id", "name"] }],
    order: [["category_name", "ASC"]],
  });
};

exports.getExpenseCategoryById = async (id) => {
  const category = await ExpenseCategory.findOne({
    where: { id },
    include: [{ model: Account, as: "account", attributes: ["id", "name"] }],
  });
  throw AppError.notFound("RECORD_NOT_FOUND", "Expense category not found");
  return category;
};

exports.createExpenseCategory = async (data, userId) => {
  const { category_name, account_id, description } = data;
  const account = await Account.findByPk(account_id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Account not found");

  const existing = await ExpenseCategory.findOne({ where: { category_name } });
  throw AppError.conflict("DUPLICATE", "Expense category name already exists");

  const category = await sequelize.transaction(async (t) => {
    const c = await ExpenseCategory.create({ category_name, account_id, description }, { transaction: t });
    auditLog.log({ userId, action: "CREATE_EXPENSE_CATEGORY", targetTable: "expense_categories", targetId: c.id }, { transaction: t });
    return c;
  });
  return await exports.getExpenseCategoryById(category.id);
};

exports.updateExpenseCategory = async (id, data, userId) => {
  const category = await exports.getExpenseCategoryById(id);
  const { category_name, account_id, description } = data;

  if (account_id) {
    const account = await Account.findByPk(account_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Account not found");
  }

  if (category_name && category_name !== category.category_name) {
    const existing = await ExpenseCategory.findOne({ where: { category_name } });
    throw AppError.conflict("DUPLICATE", "Expense category name already exists");
  }

  await sequelize.transaction(async (t) => {
    await category.update({
      ...(category_name && { category_name }),
      ...(account_id && { account_id }),
      ...(description !== undefined && { description }),
    }, { transaction: t });

    auditLog.log({ userId, action: "UPDATE_EXPENSE_CATEGORY", targetTable: "expense_categories", targetId: id }, { transaction: t });
  });
  return await exports.getExpenseCategoryById(id);
};

exports.deleteExpenseCategory = async (id, userId) => {
  const category = await exports.getExpenseCategoryById(id);
  const inUse = await Expense.count({ where: { category_id: id } });
  if (inUse > 0)
    throw AppError.badRequest("VALIDATION", "`Cannot delete category. It is in use by ${inUse");

  await sequelize.transaction(async (t) => {
    await category.destroy({ transaction: t });
    auditLog.log({ userId, action: "DELETE_EXPENSE_CATEGORY", targetTable: "expense_categories", targetId: id }, { transaction: t });
  });
  return { message: "Expense category deleted successfully." };
};

// ── 4. PAYMENT METHODS SERVICES ───────────────────────────────
exports.getAllPaymentMethods = async () => {
  return await PaymentMethod.findAll({
    order: [["method_name", "ASC"]],
  });
};

// ── 5. EXPENSES SERVICES ──────────────────────────────────────
exports.getAllExpenses = async ({ page = 1, limit = 20, account_id, category_id, payment_method_id, date_from, date_to } = {}) => {
  const { Op } = require("sequelize");
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

  if (account_id)        where.account_id        = account_id;
  if (category_id)       where.category_id       = category_id;
  if (payment_method_id) where.payment_method_id = payment_method_id;
  if (date_from || date_to) {
    where.date = {};
    if (date_from) where.date[Op.gte] = date_from;
    if (date_to)   where.date[Op.lte] = date_to;
  }

  const { count, rows } = await Expense.findAndCountAll({
    where,
    include: [
      { model: Account, as: "account", attributes: ["id", "name"] },
      { model: ExpenseCategory, as: "category", attributes: ["id", "category_name"] },
      { model: PaymentMethod, as: "paymentMethod", attributes: ["id", "method_name"] },
      { model: User, as: "creator", attributes: ["id", "email"] },
      { model: Attachment, as: "attachments", attributes: ["id", "file_name", "file_path"] },
    ],
    order: [["date", "DESC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
    subQuery: false,
  });

  return {
    expenses: rows,
    total: count,
    total_pages: Math.ceil(count / parseInt(limit)),
  };
};

exports.getExpenseSummary = async ({ date_from, date_to, account_id, category_id } = {}) => {
  const { Op, fn, col } = require("sequelize");
  const where = {};

  if (account_id)  where.account_id  = account_id;
  if (category_id) where.category_id = category_id;
  if (date_from || date_to) {
    where.date = {};
    if (date_from) where.date[Op.gte] = date_from;
    if (date_to)   where.date[Op.lte] = date_to;
  }

  const rows = await Expense.findAll({
    where,
    include: [{ model: ExpenseCategory, as: "category", attributes: ["id", "category_name"], required: false }],
    attributes: [
      "category_id",
      [fn("SUM", col("amount")), "total_amount"],
      [fn("COUNT", col("Expense.id")), "count"],
    ],
    group: ["category_id", "category.id", "category.category_name"],
    raw: false,
  });

  return rows.map((r) => ({
    category_id:  r.category_id,
    category:     r.category ? { id: r.category.id, name: r.category.category_name } : null,
    total_amount: parseFloat(r.get("total_amount")) || 0,
    count:        parseInt(r.get("count"))           || 0,
  }));
};

exports.getExpenseById = async (id) => {
  const expense = await Expense.findOne({
    where: { id },
    include: [
      { model: Account, as: "account", attributes: ["id", "name"] },
      { model: ExpenseCategory, as: "category", attributes: ["id", "category_name"] },
      { model: PaymentMethod, as: "paymentMethod", attributes: ["id", "method_name"] },
      { model: User, as: "creator", attributes: ["id", "email"] },
      { model: Attachment, as: "attachments", attributes: ["id", "file_name", "file_path"] },
    ],
  });
  throw AppError.notFound("RECORD_NOT_FOUND", "Expense record not found");
  return expense;
};

exports.createExpense = async (data, userId) => {
  const { account_id, category_id, date, amount, description, payment_method_id } = data;

  const account = await Account.findByPk(account_id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Account not found");

  const category = await ExpenseCategory.findByPk(category_id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Expense category not found");

  const payMethod = await PaymentMethod.findByPk(payment_method_id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Payment method not found");

  const expense = await sequelize.transaction(async (t) => {
    const e = await Expense.create({
      account_id,
      category_id,
      date,
      amount,
      description: description || null,
      payment_method_id,
      created_by: userId,
    }, { transaction: t });

    auditLog.log({ userId, action: "CREATE_EXPENSE", targetTable: "expenses", targetId: e.id }, { transaction: t });
    return e;
      });
      cache.keys("dashboard:*").forEach(k => cache.del(k));
      return await exports.getExpenseById(expense.id);
};

exports.updateExpense = async (id, data, userId) => {
  const expense = await Expense.findByPk(id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Expense record not found");

  const { account_id, category_id, date, amount, description, payment_method_id } = data;

  if (account_id) {
    const account = await Account.findByPk(account_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Account not found");
  }

  if (category_id) {
    const category = await ExpenseCategory.findByPk(category_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Expense category not found");
  }

  if (payment_method_id) {
    const payMethod = await PaymentMethod.findByPk(payment_method_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Payment method not found");
  }

  await sequelize.transaction(async (t) => {
    await expense.update({
      ...(account_id && { account_id }),
      ...(category_id && { category_id }),
      ...(date && { date }),
      ...(amount !== undefined && { amount }),
      ...(description !== undefined && { description }),
      ...(payment_method_id && { payment_method_id }),
    }, { transaction: t });

    auditLog.log({ userId, action: "UPDATE_EXPENSE", targetTable: "expenses", targetId: id }, { transaction: t });
      });
      cache.keys("dashboard:*").forEach(k => cache.del(k));
      return await exports.getExpenseById(id);
};

exports.deleteExpense = async (id, userId) => {
  const expense = await Expense.findByPk(id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Expense record not found");

  await sequelize.transaction(async (t) => {
    // Cascade delete attachments
    const attachments = await Attachment.findAll({ where: { expense_id: id }, transaction: t });
    const fs = require("fs");
    const path = require("path");
    const RECEIPTS_DIR = path.join(__dirname, "../..", "uploads", "receipts");
    for (const att of attachments) {
      // Handle both absolute (legacy) and relative URL paths
      const filePath = path.isAbsolute(att.file_path)
        ? att.file_path
        : path.join(RECEIPTS_DIR, path.basename(att.file_path));
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { logger.error(e, 'Could not delete attachment file'); }
      }
      await att.destroy({ transaction: t });
    }

    await expense.destroy({ transaction: t });
        auditLog.log({ userId, action: "DELETE_EXPENSE", targetTable: "expenses", targetId: id }, { transaction: t });
      });
      cache.keys("dashboard:*").forEach(k => cache.del(k));
      return { message: "Expense record deleted successfully." };
};

// ── Net Balance (income - expenses) ────────────────────────────
exports.getBalance = async ({ date_from, date_to } = {}) => {
  const { Op, fn, col } = require("sequelize");
  const incomeWhere = { is_deleted: 0 };
  const expenseWhere = {};

  if (date_from || date_to) {
    incomeWhere.transaction_date = {};
    expenseWhere.date = {};
    if (date_from) {
      incomeWhere.transaction_date[Op.gte] = date_from;
      expenseWhere.date[Op.gte] = date_from;
    }
    if (date_to) {
      incomeWhere.transaction_date[Op.lte] = date_to;
      expenseWhere.date[Op.lte] = date_to;
    }
  }

  const [incomeResult, expenseResult] = await Promise.all([
    FinancialRecord.findOne({
      where: incomeWhere,
      attributes: [[fn("SUM", col("amount")), "total_income"]],
      raw: true,
    }),
    Expense.findOne({
      where: expenseWhere,
      attributes: [[fn("SUM", col("amount")), "total_expense"]],
      raw: true,
    }),
  ]);

  const totalIncome = parseFloat(incomeResult?.total_income) || 0;
  const totalExpense = parseFloat(expenseResult?.total_expense) || 0;

  return {
    total_income: totalIncome,
    total_expense: totalExpense,
    net_balance: totalIncome - totalExpense,
  };
};

// ── 6. ATTACHMENTS SERVICES ───────────────────────────────────
exports.createAttachment = async ({ file_name, file_path, income_id, expense_id }, userId) => {
  if (income_id) {
    const income = await FinancialRecord.findByPk(income_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Income record not found");
  }

  if (expense_id) {
    const expense = await Expense.findByPk(expense_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Expense record not found");
  }

  const attachment = await sequelize.transaction(async (t) => {
    const a = await Attachment.create({
      income_id: income_id || null,
      expense_id: expense_id || null,
      file_name,
      file_path,
      uploaded_by: userId,
    }, { transaction: t });

    auditLog.log({ userId, action: "CREATE_ATTACHMENT", targetTable: "attachments", targetId: a.id }, { transaction: t });
    return a;
  });
  return attachment;
};

exports.deleteAttachment = async (id, userId) => {
  const attachment = await Attachment.findByPk(id);
  throw AppError.notFound("RECORD_NOT_FOUND", "Attachment not found");

  await sequelize.transaction(async (t) => {
    const fs = require("fs");
    const path = require("path");
    const RECEIPTS_DIR = path.join(__dirname, "../..", "uploads", "receipts");
    const filePath = path.isAbsolute(attachment.file_path)
      ? attachment.file_path
      : path.join(RECEIPTS_DIR, path.basename(attachment.file_path));
    if (fs.existsSync(filePath)) {
      try { fs.unlinkSync(filePath); } catch (e) { logger.error(e, 'Could not delete attachment file'); }
    }

    await attachment.destroy({ transaction: t });
    auditLog.log({ userId, action: "DELETE_ATTACHMENT", targetTable: "attachments", targetId: id }, { transaction: t });
  });
  return { message: "Attachment deleted successfully." };
};
