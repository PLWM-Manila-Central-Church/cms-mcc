"use strict";

const Joi = require("joi");

exports.createRecordSchema = Joi.object({
  category_id:    Joi.number().integer().positive().required(),
  type:           Joi.string().valid("Income", "Expense").required(),
  amount:         Joi.number().positive().required(),
  description:    Joi.string().max(500).allow(null, "").optional(),
  transaction_date: Joi.date().iso().required(),
  payment_method: Joi.string().max(100).allow(null, "").optional(),
  reference_no:   Joi.string().max(100).allow(null, "").optional(),
  member_id:      Joi.number().integer().positive().allow(null).optional(),
});

exports.updateRecordSchema = Joi.object({
  category_id:    Joi.number().integer().positive().optional(),
  type:           Joi.string().valid("Income", "Expense").optional(),
  amount:         Joi.number().positive().optional(),
  description:    Joi.string().max(500).allow(null, "").optional(),
  transaction_date: Joi.date().iso().optional(),
  payment_method: Joi.string().max(100).allow(null, "").optional(),
  reference_no:   Joi.string().max(100).allow(null, "").optional(),
  member_id:      Joi.number().integer().positive().allow(null).optional(),
}).min(1);

exports.createCategorySchema = Joi.object({
  name:        Joi.string().max(100).required(),
  type:        Joi.string().valid("Income", "Expense").required(),
  description: Joi.string().max(300).allow(null, "").optional(),
});

exports.updateCategorySchema = Joi.object({
  name:        Joi.string().max(100).optional(),
  type:        Joi.string().valid("Income", "Expense").optional(),
  description: Joi.string().max(300).allow(null, "").optional(),
}).min(1);
