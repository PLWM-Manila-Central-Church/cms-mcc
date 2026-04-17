"use strict";

const Joi = require("joi");

exports.createAttendanceSchema = Joi.object({
  service_id:   Joi.number().integer().positive().required(),
  member_id:    Joi.number().integer().positive().allow(null).optional(),
  attended:     Joi.boolean().required(),
  remarks:      Joi.string().max(500).allow(null, "").optional(),
});

exports.updateAttendanceSchema = Joi.object({
  attended: Joi.boolean().optional(),
  remarks:  Joi.string().max(500).allow(null, "").optional(),
}).min(1);
