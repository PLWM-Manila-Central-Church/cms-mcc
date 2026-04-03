"use strict";

const Joi = require("joi");

exports.createRoleSchema = Joi.object({
  role_name:    Joi.string().max(100).required(),
  description:  Joi.string().max(300).allow(null, "").optional(),
  permissions:  Joi.array().items(Joi.number().integer().positive()).optional(),
});

exports.updateRoleSchema = Joi.object({
  role_name:    Joi.string().max(100).optional(),
  description:  Joi.string().max(300).allow(null, "").optional(),
  permissions:  Joi.array().items(Joi.number().integer().positive()).optional(),
}).min(1);
