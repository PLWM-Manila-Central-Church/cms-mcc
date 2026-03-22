"use strict";

const Joi = require("joi");

exports.createSettingSchema = Joi.object({
  key:         Joi.string().max(100).required(),
  value:       Joi.string().max(1000).allow(null, "").optional(),
  description: Joi.string().max(300).allow(null, "").optional(),
});

exports.updateSettingSchema = Joi.object({
  value: Joi.string().max(1000).allow(null, "").optional(),
}).min(1);

// Bulk update accepts an object of key:value pairs
exports.bulkUpdateSchema = Joi.object().pattern(
  Joi.string().max(100),
  Joi.string().max(1000).allow(null, ""),
).min(1);
