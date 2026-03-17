"use strict";

const auditLog = require("../helpers/auditLog.helper");
const {
  FinancialRecord,
  FinancialCategory,
  Member,
  User,
} = require("../models");

const recordIncludes = [
  {
    model: Member.unscoped(),
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
  const { Op, fn, col, literal } = require("sequelize");
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
  if (!record) throw { status: 404, message: "Financial record not found" };
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
  if (!member) throw { status: 404, message: "Member not found" };

  const category = await FinancialCategory.findByPk(category_id);
  if (!category) throw { status: 404, message: "Financial category not found" };

  if (!category.is_active)
    throw { status: 400, message: "Financial category is inactive" };

  const record = await FinancialRecord.create({
    member_id,
    category_id,
    receipt_number: receipt_number || null,
    amount,
    payment_method: payment_method || null,
    transaction_date,
    recorded_by: recordedBy,
    notes: notes || null,
    is_deleted: 0,
  });

  const created = await exports.getRecordById(record.id);
  auditLog.log({ userId: recordedBy, action: "CREATE_FINANCE_RECORD", targetTable: "financial_records", targetId: created.id });
  return created;
};

// ── Update Financial Record ──────────────────────────────────
exports.updateRecord = async (id, data, updatedBy) => {
  const record = await FinancialRecord.findOne({ where: { id } });
  if (!record) throw { status: 404, message: "Financial record not found" };

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
    if (!member) throw { status: 404, message: "Member not found" };
  }

  if (category_id) {
    const category = await FinancialCategory.findByPk(category_id);
    if (!category)
      throw { status: 404, message: "Financial category not found" };
    if (!category.is_active)
      throw { status: 400, message: "Financial category is inactive" };
  }

  await record.update({
    ...(member_id && { member_id }),
    ...(category_id && { category_id }),
    ...(receipt_number !== undefined && { receipt_number }),
    ...(amount !== undefined && { amount }),
    ...(payment_method !== undefined && { payment_method }),
    ...(transaction_date && { transaction_date }),
    ...(notes !== undefined && { notes }),
  });

  const updated = await exports.getRecordById(id);
  auditLog.log({ userId: updatedBy, action: "UPDATE_FINANCE_RECORD", targetTable: "financial_records", targetId: id });
  return updated;
};

// ── Soft Delete Financial Record ─────────────────────────────
exports.deleteRecord = async (id, deletedBy) => {
  const record = await FinancialRecord.findOne({ where: { id } });
  if (!record) throw { status: 404, message: "Financial record not found" };

  await record.update({
    is_deleted: 1,
    deleted_at: new Date(),
    deleted_by: deletedBy,
  });

  auditLog.log({ userId: deletedBy, action: "DELETE_FINANCE_RECORD", targetTable: "financial_records", targetId: id });
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
  if (!category) throw { status: 404, message: "Financial category not found" };
  return category;
};

// ── Create Category ──────────────────────────────────────────
exports.createCategory = async (data) => {
  const { name, description } = data;

  const existing = await FinancialCategory.findOne({ where: { name } });
  if (existing) throw { status: 409, message: "Category name already exists" };

  return await FinancialCategory.create({
    name,
    description: description || null,
    is_active: 1,
  });
};

// ── Update Category ──────────────────────────────────────────
exports.updateCategory = async (id, data) => {
  const category = await FinancialCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Financial category not found" };

  const { name, description, is_active } = data;

  if (name && name !== category.name) {
    const existing = await FinancialCategory.findOne({ where: { name } });
    if (existing)
      throw { status: 409, message: "Category name already exists" };
  }

  await category.update({
    ...(name && { name }),
    ...(description !== undefined && { description }),
    ...(is_active !== undefined && { is_active }),
  });

  return category;
};

// ── Delete Category ──────────────────────────────────────────
exports.deleteCategory = async (id) => {
  const category = await FinancialCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Financial category not found" };

  const inUse = await FinancialRecord.count({ where: { category_id: id } });
  if (inUse > 0)
    throw {
      status: 400,
      message: `Cannot delete category. ${inUse} record(s) are using it`,
    };

  await category.destroy();
  return { message: "Financial category deleted successfully." };
};
// ── Get My Giving (member's own records) ─────────────────────
exports.getMyGiving = async (memberId, { page = 1, limit = 20, date_from, date_to } = {}) => {
  const { Op, fn, col } = require("sequelize");
  if (!memberId) throw { status: 400, message: "No member profile linked to this account" };

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where = { is_deleted: 0, member_id: memberId };

  if (date_from || date_to) {
    where.transaction_date = {};
    if (date_from) where.transaction_date[Op.gte] = date_from;
    if (date_to)   where.transaction_date[Op.lte] = date_to;
  }

  // Run paginated records fetch and total sum in parallel
  const [{ count, rows }, sumResult] = await Promise.all([
    FinancialRecord.findAndCountAll({
      where,
      include: [
        { model: FinancialCategory, as: "category", attributes: ["id", "name"], required: false },
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
