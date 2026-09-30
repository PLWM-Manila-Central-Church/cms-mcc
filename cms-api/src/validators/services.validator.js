"use strict";

const Joi = require("joi");

const serviceStatuses = ["draft", "published", "cancelled", "completed"];

exports.createServiceSchema = Joi.object({
  title:                Joi.string().max(150).required(),
  service_date:         Joi.date().iso().required(),
  service_time:         Joi.string().max(20).required(),
  capacity:             Joi.number().integer().positive().required(),
  total_parking_slots:  Joi.number().integer().min(0).required(),
  response_deadline:    Joi.date().iso().allow(null).optional(),
  status:               Joi.string().valid(...serviceStatuses).optional(),
});

exports.updateServiceSchema = Joi.object({
  title:                Joi.string().max(150).optional(),
  service_date:         Joi.date().iso().optional(),
  service_time:         Joi.string().max(20).optional(),
  capacity:             Joi.number().integer().positive().optional(),
  total_parking_slots:  Joi.number().integer().min(0).optional(),
  response_deadline:    Joi.date().iso().allow(null).optional(),
  status:               Joi.string().valid(...serviceStatuses).optional(),
}).min(1);

exports.updateServiceStatusSchema = Joi.object({
  status: Joi.string().valid(...serviceStatuses).required(),
});
