"use strict";

const Joi = require("joi");

const eventStatuses = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

exports.createEventSchema = Joi.object({
  title:                 Joi.string().max(200).required(),
  description:           Joi.string().max(2000).allow(null, "").optional(),
  category_id:           Joi.number().integer().positive().allow(null).optional(),
  start_date:            Joi.date().iso().required(),
  end_date:              Joi.date().iso().allow(null).optional(),
  start_time:            Joi.string().max(20).allow(null, "").optional(),
  location:              Joi.string().max(300).allow(null, "").optional(),
  capacity:              Joi.number().integer().positive().allow(null).optional(),
  registration_deadline: Joi.date().iso().allow(null).optional(),
  status:                Joi.string().valid(...eventStatuses).optional(),
});

exports.updateEventSchema = Joi.object({
  title:                 Joi.string().max(200).optional(),
  description:           Joi.string().max(2000).allow(null, "").optional(),
  category_id:           Joi.number().integer().positive().allow(null).optional(),
  start_date:            Joi.date().iso().optional(),
  end_date:              Joi.date().iso().allow(null).optional(),
  start_time:            Joi.string().max(20).allow(null, "").optional(),
  location:              Joi.string().max(300).allow(null, "").optional(),
  capacity:              Joi.number().integer().positive().allow(null).optional(),
  registration_deadline: Joi.date().iso().allow(null).optional(),
  status:                Joi.string().valid(...eventStatuses).optional(),
}).min(1);

exports.updateEventStatusSchema = Joi.object({
  status: Joi.string().valid(...eventStatuses).required(),
});

exports.registerMemberSchema = Joi.object({
  member_id: Joi.number().integer().positive().required(),
});

exports.bulkRegisterSchema = Joi.object({
  member_ids: Joi.array().items(Joi.number().integer().positive()).min(1).required(),
});
