"use strict";

const Joi = require("joi");

exports.createItemSchema = Joi.object({
  name:        Joi.string().max(200).required(),
  category_id: Joi.number().integer().positive().allow(null).optional(),
  quantity:    Joi.number().integer().min(0).required(),
  unit:        Joi.string().max(50).allow(null, "").optional(),
  description: Joi.string().max(500).allow(null, "").optional(),
  location:    Joi.string().max(200).allow(null, "").optional(),
});

exports.updateItemSchema = Joi.object({
  name:        Joi.string().max(200).optional(),
  category_id: Joi.number().integer().positive().allow(null).optional(),
  quantity:    Joi.number().integer().min(0).optional(),
  unit:        Joi.string().max(50).allow(null, "").optional(),
  description: Joi.string().max(500).allow(null, "").optional(),
  location:    Joi.string().max(200).allow(null, "").optional(),
}).min(1);

exports.createRequestSchema = Joi.object({
  item_id:     Joi.number().integer().positive().required(),
  quantity:    Joi.number().integer().positive().required(),
  reason:      Joi.string().max(500).allow(null, "").optional(),
  needed_date: Joi.date().iso().allow(null).optional(),
});

exports.reviewRequestSchema = Joi.object({
  status:  Joi.string().valid("Approved", "Rejected").required(),
  remarks: Joi.string().max(500).allow(null, "").optional(),
});

exports.createUsageSchema = Joi.object({
  item_id:    Joi.number().integer().positive().required(),
  quantity:   Joi.number().integer().positive().required(),
  used_for:   Joi.string().max(300).allow(null, "").optional(),
  used_date:  Joi.date().iso().allow(null).optional(),
});

exports.createCategorySchema = Joi.object({
  name:        Joi.string().max(100).required(),
  description: Joi.string().max(300).allow(null, "").optional(),
});

exports.updateCategorySchema = Joi.object({
  name:        Joi.string().max(100).optional(),
  description: Joi.string().max(300).allow(null, "").optional(),
}).min(1);
