"use strict";

const Joi = require("joi");

exports.createEventSchema = Joi.object({
  title:        Joi.string().max(200).required(),
  description:  Joi.string().max(2000).allow(null, "").optional(),
  category_id:  Joi.number().integer().positive().allow(null).optional(),
  event_date:   Joi.date().iso().required(),
  start_time:   Joi.string().max(20).allow(null, "").optional(),
  end_time:     Joi.string().max(20).allow(null, "").optional(),
  location:     Joi.string().max(300).allow(null, "").optional(),
  max_capacity: Joi.number().integer().positive().allow(null).optional(),
  status:       Joi.string().valid("Upcoming", "Ongoing", "Completed", "Cancelled").optional(),
});

exports.updateEventSchema = Joi.object({
  title:        Joi.string().max(200).optional(),
  description:  Joi.string().max(2000).allow(null, "").optional(),
  category_id:  Joi.number().integer().positive().allow(null).optional(),
  event_date:   Joi.date().iso().optional(),
  start_time:   Joi.string().max(20).allow(null, "").optional(),
  end_time:     Joi.string().max(20).allow(null, "").optional(),
  location:     Joi.string().max(300).allow(null, "").optional(),
  max_capacity: Joi.number().integer().positive().allow(null).optional(),
  status:       Joi.string().valid("Upcoming", "Ongoing", "Completed", "Cancelled").optional(),
}).min(1);

exports.updateEventStatusSchema = Joi.object({
  status: Joi.string().valid("Upcoming", "Ongoing", "Completed", "Cancelled").required(),
});

exports.registerMemberSchema = Joi.object({
  member_id: Joi.number().integer().positive().required(),
});

exports.bulkRegisterSchema = Joi.object({
  member_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
});
