"use strict";

const Joi = require("joi");

exports.createAttendanceSchema = Joi.object({
  service_id:      Joi.number().integer().positive().optional(),
  member_id:       Joi.number().integer().positive().required(),
  check_in_method: Joi.string().valid("barcode", "manual", "pre-reg").optional(),
  checked_in_at:   Joi.date().optional(),
});

exports.updateAttendanceSchema = Joi.object({
  check_in_method: Joi.string().valid("barcode", "manual", "pre-reg").optional(),
  checked_in_at:   Joi.date().optional(),
}).min(1);
