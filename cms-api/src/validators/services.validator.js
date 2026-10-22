"use strict";

const Joi = require("joi");

const serviceStatuses = ["draft", "published", "cancelled", "completed"];

exports.createServiceSchema = Joi.object({
  title:                Joi.string().max(150).required(),
  service_date:         Joi.date().iso().required(),
  service_time:         Joi.string().max(20).allow(null, "").optional(),
  capacity:             Joi.number().integer().positive().allow(null).optional(),
  total_parking_slots:  Joi.number().integer().min(0).allow(null).optional(),
  event_id:             Joi.number().integer().positive().allow(null).optional(),
  response_deadline:    Joi.date().iso().allow(null).optional(),
  status:               Joi.string().valid(...serviceStatuses).optional(),
});

exports.updateServiceSchema = Joi.object({
  title:                Joi.string().max(150).optional(),
  service_date:         Joi.date().iso().optional(),
  service_time:         Joi.string().max(20).allow(null, "").optional(),
  capacity:             Joi.number().integer().positive().allow(null).optional(),
  total_parking_slots:  Joi.number().integer().min(0).allow(null).optional(),
  event_id:             Joi.number().integer().positive().allow(null).optional(),
  response_deadline:    Joi.date().iso().allow(null).optional(),
  status:               Joi.string().valid(...serviceStatuses).optional(),
}).min(1);

exports.updateServiceStatusSchema = Joi.object({
  status: Joi.string().valid(...serviceStatuses).required(),
});

const serviceResponseFields = {
  attendance_status: Joi.string().valid("ATTENDING", "NOT_ATTENDING", "UNDECIDED").required(),
  seat_number: Joi.number().integer().positive().allow(null).optional(),
  parking_slot: Joi.number().integer().positive().allow(null).optional(),
  override_reason: Joi.string().max(1000).allow(null, "").optional(),
};

exports.createServiceResponseSchema = Joi.object({
  member_id: Joi.number().integer().positive().required(),
  ...serviceResponseFields,
});

exports.createServiceResponseAliasSchema = Joi.object({
  member_id: Joi.number().integer().positive().optional(),
  ...serviceResponseFields,
});
