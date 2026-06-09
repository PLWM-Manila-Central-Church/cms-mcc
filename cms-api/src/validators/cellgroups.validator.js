"use strict";

const Joi = require("joi");

exports.createCellGroupSchema = Joi.object({
  name: Joi.string().max(200).required(),
  area: Joi.string().max(200).optional().allow(""),
});

exports.updateCellGroupSchema = Joi.object({
  name: Joi.string().max(200).optional(),
  area: Joi.string().max(200).optional().allow(""),
}).min(1);

exports.createCellGroupHistorySchema = Joi.object({
  member_id:      Joi.number().integer().positive().required(),
  cell_group_id:  Joi.number().integer().positive().allow(null).optional(),
  change_date:    Joi.date().iso().optional(),
  remarks:        Joi.string().max(500).allow(null, "").optional(),
});
