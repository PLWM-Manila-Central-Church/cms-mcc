"use strict";

const Joi = require("joi");

exports.createApplicationSchema = Joi.object({
  ministry_role_id: Joi.number().integer().positive().required(),
  message: Joi.string().max(1000).allow(null, "").optional(),
});

exports.reviewApplicationSchema = Joi.object({
  status: Joi.string().valid("approved", "rejected").required(),
  review_note: Joi.string().max(1000).allow(null, "").when("status", {
    is: "rejected",
    then: Joi.string().min(5).required(),
    otherwise: Joi.optional(),
  }),
});

exports.listApplicationsQuerySchema = Joi.object({
  status: Joi.string().valid("pending", "approved", "rejected", "withdrawn").optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
});
