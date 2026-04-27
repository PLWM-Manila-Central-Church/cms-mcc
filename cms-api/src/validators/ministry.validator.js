"use strict";

const Joi = require("joi");

exports.createRoleSchema = Joi.object({
  name:        Joi.string().max(150).required(),
  description: Joi.string().max(500).allow(null, "").optional(),
});

exports.updateRoleSchema = Joi.object({
  name:        Joi.string().max(150).optional(),
  description: Joi.string().max(500).allow(null, "").optional(),
}).min(1);

exports.createAssignmentSchema = Joi.object({
  member_id:        Joi.number().integer().positive().required(),
  ministry_role_id: Joi.number().integer().positive().required(),
  service_id:       Joi.number().integer().positive().required(),
  notes:            Joi.string().max(500).allow(null, "").optional(),
});

exports.updateAssignmentSchema = Joi.object({
  member_id:        Joi.number().integer().positive().optional(),
  ministry_role_id: Joi.number().integer().positive().optional(),
  service_id:       Joi.number().integer().positive().required(),
  notes:            Joi.string().max(500).allow(null, "").optional(),
}).min(1);
