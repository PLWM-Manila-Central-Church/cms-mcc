"use strict";

const Joi = require("joi");

exports.createCellGroupSchema = Joi.object({
  name:        Joi.string().max(150).required(),
  leader_id:   Joi.number().integer().positive().allow(null).optional(),
  location:    Joi.string().max(300).allow(null, "").optional(),
  description: Joi.string().max(500).allow(null, "").optional(),
  day_of_week: Joi.string().max(20).allow(null, "").optional(),
  meeting_time: Joi.string().max(30).allow(null, "").optional(),
});

exports.updateCellGroupSchema = Joi.object({
  name:        Joi.string().max(150).optional(),
  leader_id:   Joi.number().integer().positive().allow(null).optional(),
  location:    Joi.string().max(300).allow(null, "").optional(),
  description: Joi.string().max(500).allow(null, "").optional(),
  day_of_week: Joi.string().max(20).allow(null, "").optional(),
  meeting_time: Joi.string().max(30).allow(null, "").optional(),
}).min(1);

exports.createCellGroupHistorySchema = Joi.object({
  member_id:      Joi.number().integer().positive().required(),
  cell_group_id:  Joi.number().integer().positive().allow(null).optional(),
  change_date:    Joi.date().iso().optional(),
  remarks:        Joi.string().max(500).allow(null, "").optional(),
});
