"use strict";

const Joi = require("joi");

exports.createSubstituteRequestSchema = Joi.object({
  service_id: Joi.number().integer().positive().required(),
  reason: Joi.string().trim().min(5).max(500).required(),
  proposed_member_id: Joi.number().integer().positive().optional(),
});
