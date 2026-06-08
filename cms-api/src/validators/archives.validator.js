"use strict";

const Joi = require("joi");

exports.getArchivesQuerySchema = Joi.object({
  page:        Joi.number().integer().min(1).default(1),
  limit:       Joi.number().integer().min(1).max(100).default(15),
  category_id: Joi.number().integer().positive().optional(),
  status:      Joi.string().valid("pending", "approved", "rejected").optional(),
  visibility:  Joi.string().valid("public", "restricted", "confidential").optional(),
  search:      Joi.string().max(200).allow("").optional(),
});

