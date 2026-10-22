"use strict";

const cache    = require("../helpers/cache.helper");
const auditLog  = require("../helpers/auditLog.helper");
const sequelize = require("../config/db");
const AppError = require("../helpers/AppError");
const uploadStorage = require("../middlewares/upload-s3");
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
  {
    model: Attachment,
    as: "attachments",
    attributes: ["id", "file_name", "uploaded_at"],
    separate: true,
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
  if (!record) throw AppError.notFound("RECORD_NOT_FOUND", "Financial record not found");
  return record;
};

// ── Create Financial Record ──────────────────────────────────
exports.createRecord = async (data, recordedBy) => {
  const {
    member_id,
    is_anonymous = false,
    category_id,
    receipt_number,
    amount,
    payment_method,
    transaction_date,
    notes,
  } = data;

  const anonymous = is_anonymous === true;
  if (anonymous && member_id) {
    throw AppError.badRequest("ANONYMOUS_MEMBER_CONFLICT", "Anonymous records cannot be linked to a member");
  }
  if (!anonymous && !member_id) {
    throw AppError.badRequest("MEMBER_REQUIRED", "Select a member or mark this record as anonymous");
  }
  if (member_id) {
    const member = await Member.findByPk(member_id);
    if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");
  }

  const category = await FinancialCategory.findByPk(category_id);
  if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Financial category not found");

  if (!category.is_active)
    throw AppError.badRequest("VALIDATION", "Financial category is inactive");

  const record = await sequelize.transaction(async (t) => {
    const r = await FinancialRecord.create({
      member_id: anonymous ? null : member_id,
      is_anonymous: anonymous ? 1 : 0,
      category_id,
      receipt_number: receipt_number || null,
      amount,
      payment_method: payment_method || null,
      transaction_date,
      recorded_by: recordedBy,
      notes: notes || null,
      is_deleted: 0,
    }, { transaction: t });

    await auditLog.log({ userId: recordedBy, action: "CREATE_FINANCE_RECORD", targetTable: "financial_records", targetId: r.id }, { transaction: t });
    return r;
  });

  const created = await exports.getRecordById(record.id);
    cache.keys("dashboard:*").forEach(k => cache.del(k));
    return created;
};

// ── Update Financial Record ──────────────────────────────────
exports.updateRecord = async (id, data, updatedBy) => {
  const record = await FinancialRecord.findOne({ where: { id } });
  if (!record) throw AppError.notFound("RECORD_NOT_FOUND", "Financial record not found");

  const {
    member_id,
    is_anonymous,
    category_id,
    receipt_number,
    amount,
    payment_method,
    transaction_date,
    notes,
  } = data;

  const nextAnonymous = is_anonymous === undefined ? Boolean(record.is_anonymous) : is_anonymous === true;
  const nextMemberId = nextAnonymous ? null : (member_id !== undefined ? member_id : record.member_id);
  if (nextAnonymous && member_id) {
    throw AppError.badRequest("ANONYMOUS_MEMBER_CONFLICT", "Anonymous records cannot be linked to a member");
  }
  if (!nextAnonymous && !nextMemberId) {
    throw AppError.badRequest("MEMBER_REQUIRED", "Select a member or keep this record anonymous");
  }
  if (nextMemberId) {
    const member = await Member.findByPk(nextMemberId);
    if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");
  }

  if (category_id) {
    const category = await FinancialCategory.findByPk(category_id);
    if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Financial category not found");
    if (!category.is_active) throw AppError.badRequest("VALIDATION", "Financial category is inactive");
  }

  await sequelize.transaction(async (t) => {
    await record.update({
      ...((member_id !== undefined || is_anonymous !== undefined) && {
        member_id: nextMemberId,
        is_anonymous: nextAnonymous ? 1 : 0,
      }),
      ...(category_id         && { category_id }),
      ...(receipt_number !== undefined && { receipt_number }),
      ...(amount         !== undefined && { amount }),
      ...(payment_method !== undefined && { payment_method }),
      ...(transaction_date             && { transaction_date }),
      ...(notes          !== undefined && { notes }),
    }, { transaction: t });

    await auditLog.log({ userId: updatedBy, action: "UPDATE_FINANCE_RECORD", targetTable: "financial_records", targetId: id }, { transaction: t });
  });

  const updated = await exports.getRecordById(id);
  cache.keys("dashboard:*").forEach((key) => cache.del(key));
  return updated;
};

// ── Soft Delete Financial Record ─────────────────────────────
exports.archiveRecord = async (id, deletedBy) => {
  const record = await FinancialRecord.findOne({ where: { id } });
  if (!record) throw AppError.notFound("RECORD_NOT_FOUND", "Financial record not found");

  await sequelize.transaction(async (t) => {
    await record.update({
      is_deleted: 1,
      deleted_at: new Date(),
      deleted_by: deletedBy,
    }, { transaction: t });

    await auditLog.log({ userId: deletedBy, action: "ARCHIVE_FINANCE_RECORD", targetTable: "financial_records", targetId: id }, { transaction: t });
  });

  cache.keys("dashboard:*").forEach(k => cache.del(k));
  return { message: "Financial record archived. Receipt attachments and giving history were retained." };
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
  if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Financial category not found");
  return category;
};

// ── Create Category ──────────────────────────────────────────
exports.createCategory = async (data) => {
  const { name, description } = data;

  const existing = await FinancialCategory.findOne({ where: { name } });
  if (existing) throw AppError.conflict("DUPLICATE", "Category name already exists");

  return await FinancialCategory.create({
    name,
    description: description || null,
    is_active: 1,
  });
};

// ── Update Category ──────────────────────────────────────────
exports.updateCategory = async (id, data) => {
  const category = await FinancialCategory.findByPk(id);
  if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Financial category not found");

  const { name, description, is_active } = data;

  if (name && name !== category.name) {
    const existing = await FinancialCategory.findOne({ where: { name } });
    if (existing) throw AppError.conflict("DUPLICATE", "Category name already exists");
  }

  await category.update({
    ...(name        && { name }),
    ...(description !== undefined && { description }),
    ...(is_active   !== undefined && { is_active }),
  });

  return category;
};

// ── Get My Giving (member's own records) ─────────────────────
exports.getMyGiving = async (memberId, { page = 1, limit = 20, date_from, date_to } = {}) => {
  const { Op, fn, col } = require("sequelize");
  if (!memberId) throw AppError.badRequest("VALIDATION", "No member profile linked to this account");

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
        { model: Attachment, as: "attachments", attributes: ["id", "file_name", "uploaded_at"], separate: true },
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

// ── Member lookup for finance entry forms ────────────────────
// Return only the fields needed to identify a giver. Finance staff do not
// receive access to the broader member directory through this endpoint.
exports.searchGivingMembers = async ({ q, limit = 6 } = {}) => {
  const { Op } = require("sequelize");
  const terms = String(q || "").trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];

  const where = {
    [Op.and]: terms.map((term) => ({
      [Op.or]: [
        { first_name: { [Op.like]: `%${term}%` } },
        { last_name:  { [Op.like]: `%${term}%` } },
      ],
    })),
  };

  return Member.findAll({
    where,
    attributes: ["id", "first_name", "last_name"],
    order: [["last_name", "ASC"], ["first_name", "ASC"]],
    limit: Math.min(10, Math.max(1, Number.parseInt(limit, 10) || 6)),
  });
};

// ── 1. FUNDS SERVICES ─────────────────────────────────────────
exports.getAllFunds = async () => {
  return await Fund.findAll({
    order: [["name", "ASC"]],
  });
};

exports.getFundById = async (id) => {
  const fund = await Fund.findByPk(id);
  if (!fund) throw AppError.notFound("RECORD_NOT_FOUND", "Fund not found");
  return fund;
};

exports.createFund = async (data, userId) => {
  const { name, description } = data;
  const existing = await Fund.findOne({ where: { name } });
  if (existing) throw AppError.conflict("DUPLICATE", "Fund name already exists");

  const fund = await sequelize.transaction(async (t) => {
    const f = await Fund.create({ name, description }, { transaction: t });
    await auditLog.log({ userId, action: "CREATE_FUND", targetTable: "funds", targetId: f.id }, { transaction: t });
    return f;
  });
  return fund;
};

exports.updateFund = async (id, data, userId) => {
  const fund = await exports.getFundById(id);
  const { name, description } = data;

  if (name && name !== fund.name) {
    const existing = await Fund.findOne({ where: { name } });
    if (existing) throw AppError.conflict("DUPLICATE", "Fund name already exists");
  }

  await sequelize.transaction(async (t) => {
    await fund.update({
      ...(name && { name }),
      ...(description !== undefined && { description }),
    }, { transaction: t });

    await auditLog.log({ userId, action: "UPDATE_FUND", targetTable: "funds", targetId: id }, { transaction: t });
  });
  return fund;
};

exports.archiveFund = async (id, userId) => {
  const fund = await exports.getFundById(id);
  const inUse = await Account.count({ where: { fund_id: id } });
  if (inUse > 0)
    throw AppError.conflict("FUND_IN_USE", `Archive its ${inUse} active account(s) first.`);

  await sequelize.transaction(async (t) => {
    await fund.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: userId }, { transaction: t });
    await auditLog.log({ userId, action: "ARCHIVE_FUND", targetTable: "funds", targetId: id }, { transaction: t });
  });
  return { message: "Fund archived. Its history is retained and can be restored from System Archives." };
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
  if (!account) throw AppError.notFound("RECORD_NOT_FOUND", "Account not found");
  return account;
};

exports.createAccount = async (data, userId) => {
  const { name, fund_id, description } = data;
  const fund = await Fund.findByPk(fund_id);
  if (!fund) throw AppError.notFound("RECORD_NOT_FOUND", "Fund not found");

  const existing = await Account.findOne({ where: { name } });
  if (existing) throw AppError.conflict("DUPLICATE", "Account name already exists");

  const account = await sequelize.transaction(async (t) => {
    const a = await Account.create({ name, fund_id, description }, { transaction: t });
    await auditLog.log({ userId, action: "CREATE_ACCOUNT", targetTable: "accounts", targetId: a.id }, { transaction: t });
    return a;
  });
  return await exports.getAccountById(account.id);
};

exports.updateAccount = async (id, data, userId) => {
  const account = await exports.getAccountById(id);
  const { name, fund_id, description } = data;

  if (fund_id) {
    const fund = await Fund.findByPk(fund_id);
    if (!fund) throw AppError.notFound("RECORD_NOT_FOUND", "Fund not found");
  }

  if (name && name !== account.name) {
    const existing = await Account.findOne({ where: { name } });
    if (existing) throw AppError.conflict("DUPLICATE", "Account name already exists");
  }

  await sequelize.transaction(async (t) => {
    await account.update({
      ...(name && { name }),
      ...(fund_id && { fund_id }),
      ...(description !== undefined && { description }),
    }, { transaction: t });

    await auditLog.log({ userId, action: "UPDATE_ACCOUNT", targetTable: "accounts", targetId: id }, { transaction: t });
  });
  return await exports.getAccountById(id);
};

exports.archiveAccount = async (id, userId) => {
  const account = await exports.getAccountById(id);
  const inUseExpenses = await Expense.count({ where: { account_id: id } });
  const inUseCategories = await ExpenseCategory.count({ where: { account_id: id } });

  if (inUseExpenses > 0 || inUseCategories > 0)
    throw AppError.conflict("ACCOUNT_IN_USE", "Archive its active expenses and categories first.");

  await sequelize.transaction(async (t) => {
    await account.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: userId }, { transaction: t });
    await auditLog.log({ userId, action: "ARCHIVE_ACCOUNT", targetTable: "accounts", targetId: id }, { transaction: t });
  });
  return { message: "Account archived. Its history is retained and can be restored from System Archives." };
};

// ── 3. EXPENSE CATEGORIES SERVICES ────────────────────────────
exports.getAllExpenseCategories = async () => {
  return await ExpenseCategory.findAll({
    order: [["category_name", "ASC"]],
  });
};

exports.getExpenseCategoryById = async (id) => {
  const category = await ExpenseCategory.findOne({ where: { id } });
  if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Expense category not found");
  return category;
};

exports.createExpenseCategory = async (data, userId) => {
  const { category_name, description } = data;

  const existing = await ExpenseCategory.findOne({ where: { category_name } });
  if (existing) throw AppError.conflict("DUPLICATE", "Expense category name already exists");

  const category = await sequelize.transaction(async (t) => {
    const c = await ExpenseCategory.create({ category_name, account_id: null, description }, { transaction: t });
    await auditLog.log({ userId, action: "CREATE_EXPENSE_CATEGORY", targetTable: "expense_categories", targetId: c.id }, { transaction: t });
    return c;
  });
  return await exports.getExpenseCategoryById(category.id);
};

exports.updateExpenseCategory = async (id, data, userId) => {
  const category = await exports.getExpenseCategoryById(id);
  const { category_name, description } = data;

  if (category_name && category_name !== category.category_name) {
    const existing = await ExpenseCategory.findOne({ where: { category_name } });
    if (existing) throw AppError.conflict("DUPLICATE", "Expense category name already exists");
  }

  await sequelize.transaction(async (t) => {
    await category.update({
      ...(category_name && { category_name }),
      ...(description !== undefined && { description }),
    }, { transaction: t });

    await auditLog.log({ userId, action: "UPDATE_EXPENSE_CATEGORY", targetTable: "expense_categories", targetId: id }, { transaction: t });
  });
  return await exports.getExpenseCategoryById(id);
};

exports.archiveExpenseCategory = async (id, userId) => {
  const category = await exports.getExpenseCategoryById(id);
  const inUse = await Expense.count({ where: { category_id: id } });
  if (inUse > 0)
    throw AppError.conflict("EXPENSE_CATEGORY_IN_USE", `Archive its ${inUse} active expense(s) first.`);

  await sequelize.transaction(async (t) => {
    await category.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: userId }, { transaction: t });
    await auditLog.log({ userId, action: "ARCHIVE_EXPENSE_CATEGORY", targetTable: "expense_categories", targetId: id }, { transaction: t });
  });
  return { message: "Expense category archived. Its history is retained and a System Admin can restore it from System Archives." };
};

// ── 4. PAYMENT METHODS SERVICES ───────────────────────────────
exports.getAllPaymentMethods = async () => {
  return await PaymentMethod.findAll({
    order: [["method_name", "ASC"]],
  });
};

// ── 5. EXPENSES SERVICES ──────────────────────────────────────
exports.getAllExpenses = async ({ page = 1, limit = 20, category_id, payment_method_id, date_from, date_to } = {}) => {
  const { Op } = require("sequelize");
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = {};

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
      { model: ExpenseCategory, as: "category", attributes: ["id", "category_name"] },
      { model: PaymentMethod, as: "paymentMethod", attributes: ["id", "method_name"] },
      { model: User, as: "creator", attributes: ["id", "email"] },
      { model: Attachment, as: "attachments", attributes: ["id", "file_name", "uploaded_at"], separate: true },
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

exports.getExpenseSummary = async ({ date_from, date_to, category_id } = {}) => {
  const { Op, fn, col } = require("sequelize");
  const where = {};

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
      { model: ExpenseCategory, as: "category", attributes: ["id", "category_name"] },
      { model: PaymentMethod, as: "paymentMethod", attributes: ["id", "method_name"] },
      { model: User, as: "creator", attributes: ["id", "email"] },
      { model: Attachment, as: "attachments", attributes: ["id", "file_name", "uploaded_at"], separate: true },
    ],
  });
  if (!expense) throw AppError.notFound("RECORD_NOT_FOUND", "Expense record not found");
  return expense;
};

exports.createExpense = async (data, userId) => {
  const { category_id, date, amount, description, payment_method_id } = data;
  const category = await ExpenseCategory.findByPk(category_id);
  if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Expense category not found");

  const payMethod = await PaymentMethod.findByPk(payment_method_id);
  if (!payMethod) throw AppError.notFound("RECORD_NOT_FOUND", "Payment method not found");

  const expense = await sequelize.transaction(async (t) => {
    const e = await Expense.create({
      account_id: null,
      category_id,
      date,
      amount,
      description: description || null,
      payment_method_id,
      created_by: userId,
    }, { transaction: t });

    await auditLog.log({ userId, action: "CREATE_EXPENSE", targetTable: "expenses", targetId: e.id }, { transaction: t });
    return e;
      });
      cache.keys("dashboard:*").forEach(k => cache.del(k));
      return await exports.getExpenseById(expense.id);
};

exports.updateExpense = async (id, data, userId) => {
  const expense = await Expense.findByPk(id);
  if (!expense) throw AppError.notFound("RECORD_NOT_FOUND", "Expense record not found");

  const { category_id, date, amount, description, payment_method_id } = data;

  const nextCategoryId = category_id ?? expense.category_id;
  const category = await ExpenseCategory.findByPk(nextCategoryId);
  if (!category) throw AppError.notFound("RECORD_NOT_FOUND", "Expense category not found");

  if (payment_method_id) {
    const payMethod = await PaymentMethod.findByPk(payment_method_id);
    if (!payMethod) throw AppError.notFound("RECORD_NOT_FOUND", "Payment method not found");
  }

  await sequelize.transaction(async (t) => {
    await expense.update({
      category_id: nextCategoryId,
      ...(date && { date }),
      ...(amount !== undefined && { amount }),
      ...(description !== undefined && { description }),
      ...(payment_method_id && { payment_method_id }),
    }, { transaction: t });

    await auditLog.log({ userId, action: "UPDATE_EXPENSE", targetTable: "expenses", targetId: id }, { transaction: t });
      });
      cache.keys("dashboard:*").forEach(k => cache.del(k));
      return await exports.getExpenseById(id);
};

exports.archiveExpense = async (id, userId) => {
  const expense = await Expense.findByPk(id);
  if (!expense) throw AppError.notFound("RECORD_NOT_FOUND", "Expense record not found");

  await sequelize.transaction(async (t) => {
    await expense.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: userId }, { transaction: t });
    await auditLog.log({ userId, action: "ARCHIVE_EXPENSE", targetTable: "expenses", targetId: id }, { transaction: t });
  });
  cache.keys("dashboard:*").forEach((key) => cache.del(key));
  return { message: "Expense archived. Its receipt files and history are retained and a System Admin can restore it from System Archives." };
};

// ── Net Balance (income - expenses) ────────────────────────────
exports.getBalance = async ({ date_from, date_to } = {}) => {
  const { Op, fn, col } = require("sequelize");
  const incomeWhere = { is_deleted: 0 };
  const expenseWhere = { is_deleted: 0 };

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
  const hasIncomeId = income_id !== null && income_id !== undefined && String(income_id).trim() !== "";
  const hasExpenseId = expense_id !== null && expense_id !== undefined && String(expense_id).trim() !== "";
  if (hasIncomeId === hasExpenseId) {
    throw AppError.badRequest("VALIDATION", "An attachment must be linked to exactly one income or expense record");
  }

  const ownerId = Number(hasIncomeId ? income_id : expense_id);
  if (!Number.isSafeInteger(ownerId) || ownerId <= 0) {
    throw AppError.badRequest("VALIDATION", "The attachment record ID is invalid");
  }

  const fileName = String(file_name || "")
    .replace(/[\\/\u0000-\u001f\u007f]/g, "_")
    .trim()
    .slice(0, 255);
  const fileKey = uploadStorage.getStoredFileKey(file_path, "receipts");
  if (!fileName || !fileKey) {
    throw AppError.badRequest("VALIDATION", "The receipt file details are invalid");
  }
  const storedPath = uploadStorage.getFileUrl(fileKey);

  if (hasIncomeId) {
    const income = await FinancialRecord.findOne({ where: { id: ownerId, is_deleted: 0 }, attributes: ["id"] });
    if (!income) throw AppError.notFound("RECORD_NOT_FOUND", "Income record not found");
  } else {
    const expense = await Expense.findOne({ where: { id: ownerId, is_deleted: 0 }, attributes: ["id"] });
    if (!expense) throw AppError.notFound("RECORD_NOT_FOUND", "Expense record not found");
  }

  const attachment = await sequelize.transaction(async (t) => {
    const a = await Attachment.create({
      income_id: hasIncomeId ? ownerId : null,
      expense_id: hasExpenseId ? ownerId : null,
      file_name: fileName,
      file_path: storedPath,
      uploaded_by: userId,
    }, { transaction: t });

    await auditLog.log({ userId, action: "CREATE_ATTACHMENT", targetTable: "attachments", targetId: a.id }, { transaction: t });
    return a;
  });
  return attachment;
};

exports.getAttachmentDownloadKey = async (id) => {
  const attachmentId = Number(id);
  if (!Number.isSafeInteger(attachmentId) || attachmentId <= 0) {
    throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");
  }
  const attachment = await Attachment.findByPk(attachmentId, { attributes: ["id", "file_path", "income_id", "expense_id"] });
  if (!attachment) throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");
  if (attachment.income_id) {
    const income = await FinancialRecord.findOne({ where: { id: attachment.income_id, is_deleted: 0 }, attributes: ["id"] });
    if (!income) throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");
  } else if (attachment.expense_id) {
    const expense = await Expense.findOne({ where: { id: attachment.expense_id, is_deleted: 0 }, attributes: ["id"] });
    if (!expense) throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");
  } else {
    throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");
  }
  const key = uploadStorage.getStoredFileKey(attachment.file_path, "receipts");
  if (!key) throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");
  return key;
};

exports.getMemberAttachmentDownloadKey = async (id, memberId) => {
  const attachmentId = Number(id);
  if (!Number.isSafeInteger(Number(memberId)) || Number(memberId) <= 0) {
    throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");
  }
  if (!Number.isSafeInteger(attachmentId) || attachmentId <= 0) {
    throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");
  }

  const attachment = await Attachment.findByPk(attachmentId, {
    attributes: ["id", "income_id", "expense_id", "file_path"],
  });
  if (!attachment || !attachment.income_id || attachment.expense_id) {
    throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");
  }

  const income = await FinancialRecord.findOne({
    where: { id: attachment.income_id, member_id: Number(memberId), is_deleted: 0 },
    attributes: ["id"],
  });
  if (!income) throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");

  const key = uploadStorage.getStoredFileKey(attachment.file_path, "receipts");
  if (!key) throw AppError.notFound("RECORD_NOT_FOUND", "Receipt attachment not found");
  return key;
};

exports.archiveAttachment = async (id, userId) => {
  const attachmentId = Number(id);
  if (!Number.isSafeInteger(attachmentId) || attachmentId <= 0) {
    throw AppError.notFound("RECORD_NOT_FOUND", "Attachment not found");
  }
  const attachment = await Attachment.findOne({ where: { id: attachmentId, is_deleted: 0 } });
  if (!attachment) throw AppError.notFound("RECORD_NOT_FOUND", "Attachment not found");

  await sequelize.transaction(async (t) => {
    await attachment.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: userId }, { transaction: t });
    await auditLog.log({ userId, action: "ARCHIVE_ATTACHMENT", targetTable: "attachments", targetId: attachmentId }, { transaction: t });
  });
  return { message: "Receipt archived. The uploaded file remains available for restoration." };
};
