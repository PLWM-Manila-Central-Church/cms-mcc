"use strict";

const Joi = require("joi");

exports.createRecordSchema = Joi.object({
  category_id:      Joi.number().integer().positive().required(),
  amount:           Joi.number().positive().required(),
  description:      Joi.string().max(500).allow(null, "").optional(),
  transaction_date: Joi.date().iso().required(),
  payment_method:   Joi.string().max(100).allow(null, "").optional(),
  receipt_number:   Joi.string().max(100).allow(null, "").optional(),
  member_id:        Joi.number().integer().positive().allow(null).optional(),
  notes:            Joi.string().max(1000).allow(null, "").optional(),
});

exports.updateRecordSchema = Joi.object({
  category_id:      Joi.number().integer().positive().optional(),
  amount:           Joi.number().positive().optional(),
  description:      Joi.string().max(500).allow(null, "").optional(),
  transaction_date: Joi.date().iso().optional(),
  payment_method:   Joi.string().max(100).allow(null, "").optional(),
  receipt_number:   Joi.string().max(100).allow(null, "").optional(),
  member_id:        Joi.number().integer().positive().allow(null).optional(),
  notes:            Joi.string().max(1000).allow(null, "").optional(),
}).min(1);

exports.createCategorySchema = Joi.object({
  name:        Joi.string().max(100).required(),
  description: Joi.string().max(300).allow(null, "").optional(),
});

exports.updateCategorySchema = Joi.object({
  name:        Joi.string().max(100).optional(),
  description: Joi.string().max(300).allow(null, "").optional(),
}).min(1);

// ── Fund schemas ─────────────────────────────────────────────
exports.createFundSchema = Joi.object({
  name: Joi.string().max(100).required(),
  description: Joi.string().max(500).allow(null, "").optional(),
});

exports.updateFundSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  description: Joi.string().max(500).allow(null, "").optional(),
}).min(1);

// ── Account schemas ──────────────────────────────────────────
exports.createAccountSchema = Joi.object({
  name: Joi.string().max(100).required(),
  fund_id: Joi.number().integer().positive().required(),
  description: Joi.string().max(500).allow(null, "").optional(),
});

exports.updateAccountSchema = Joi.object({
  name: Joi.string().max(100).optional(),
  fund_id: Joi.number().integer().positive().optional(),
  description: Joi.string().max(500).allow(null, "").optional(),
}).min(1);

// ── Expense Category schemas ─────────────────────────────────
exports.createExpenseCategorySchema = Joi.object({
  category_name: Joi.string().max(100).required(),
  account_id: Joi.number().integer().positive().required(),
  description: Joi.string().max(500).allow(null, "").optional(),
});

exports.updateExpenseCategorySchema = Joi.object({
  category_name: Joi.string().max(100).optional(),
  account_id: Joi.number().integer().positive().optional(),
  description: Joi.string().max(500).allow(null, "").optional(),
}).min(1);

// ── Expense schemas ──────────────────────────────────────────
exports.createExpenseSchema = Joi.object({
  account_id: Joi.number().integer().positive().required(),
  category_id: Joi.number().integer().positive().required(),
  date: Joi.date().iso().required(),
  amount: Joi.number().positive().required(),
  description: Joi.string().max(500).allow(null, "").optional(),
  payment_method_id: Joi.number().integer().positive().required(),
});

exports.updateExpenseSchema = Joi.object({
  account_id: Joi.number().integer().positive().optional(),
  category_id: Joi.number().integer().positive().optional(),
  date: Joi.date().iso().optional(),
  amount: Joi.number().positive().optional(),
  description: Joi.string().max(500).allow(null, "").optional(),
  payment_method_id: Joi.number().integer().positive().optional(),
}).min(1);
