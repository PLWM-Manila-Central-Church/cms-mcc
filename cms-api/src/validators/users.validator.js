"use strict";

const Joi = require("joi");

const passwordSchema = Joi.string()
  .min(8).max(72)
  .pattern(/[A-Z]/, "uppercase")
  .pattern(/[a-z]/, "lowercase")
  .pattern(/[0-9]/, "number")
  .required()
  .messages({
    "string.min":          "Password must be at least 8 characters",
    "string.max":          "Password must not exceed 72 characters",
    "string.pattern.name": "Password must contain at least one {#name} letter",
  });

exports.createUserSchema = Joi.object({
  email:              Joi.string().email().max(150).required(),
  password:           passwordSchema,
  role_id:            Joi.number().integer().positive().required(),
  member_id:          Joi.number().integer().positive().allow(null).optional(),
  invited_member_id:  Joi.number().integer().positive().allow(null).optional(),
  // Inline member creation fields
  first_name:         Joi.string().max(100).optional(),
  last_name:          Joi.string().max(100).optional(),
  phone:              Joi.string().max(30).allow(null, "").optional(),
  gender:             Joi.string().valid("Male", "Female", "Other").allow(null, "").optional(),
  birthdate:          Joi.date().iso().allow(null).optional(),
  spiritual_birthday: Joi.date().iso().allow(null).optional(),
  address:            Joi.string().max(500).allow(null, "").optional(),
  cell_group_id:      Joi.number().integer().positive().allow(null).optional(),
  group_id:           Joi.number().integer().positive().allow(null).optional(),
  // Leader assignment fields
  leads_cell_group_id: Joi.number().integer().positive().allow(null).optional(),
  leads_group_id:      Joi.number().integer().positive().allow(null).optional(),
  ministry_role_id:    Joi.number().integer().positive().allow(null).optional(),
});

exports.updateUserSchema = Joi.object({
  email:             Joi.string().email().max(150).optional(),
  role_id:           Joi.number().integer().positive().optional(),
  member_id:         Joi.number().integer().positive().allow(null).optional(),
  invited_member_id: Joi.number().integer().positive().allow(null).optional(),
  is_active:         Joi.number().integer().valid(0, 1).optional(),
  // Inline member update fields
  first_name:         Joi.string().max(100).optional(),
  last_name:          Joi.string().max(100).optional(),
  phone:              Joi.string().max(30).allow(null, "").optional(),
  gender:             Joi.string().valid("Male", "Female", "Other").allow(null, "").optional(),
  birthdate:          Joi.date().iso().allow(null).optional(),
  spiritual_birthday: Joi.date().iso().allow(null).optional(),
  address:            Joi.string().max(500).allow(null, "").optional(),
  cell_group_id:      Joi.number().integer().positive().allow(null).optional(),
  group_id:           Joi.number().integer().positive().allow(null).optional(),
  // Leader assignment fields
  leads_cell_group_id: Joi.number().integer().positive().allow(null).optional(),
  leads_group_id:      Joi.number().integer().positive().allow(null).optional(),
  ministry_role_id:    Joi.number().integer().positive().allow(null).optional(),
}).min(1);
