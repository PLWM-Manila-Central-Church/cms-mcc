"use strict";

const Joi = require("joi");

const memberBody = {
  first_name:         Joi.string().max(100).required(),
  last_name:          Joi.string().max(100).required(),
  email:              Joi.string().email().max(150).allow(null, "").optional(),
  phone:              Joi.string().max(30).allow(null, "").optional(),
  gender:             Joi.string().valid("Male", "Female").allow(null, "").optional(),
  birthdate:          Joi.date().iso().allow(null, "").optional(),
  spiritual_birthday: Joi.date().iso().allow(null, "").optional(),
  address:            Joi.string().max(500).allow(null, "").optional(),
  cell_group_id:      Joi.number().integer().positive().allow(null).optional(),
  group_id:           Joi.number().integer().positive().allow(null).optional(),
  status:             Joi.string().valid("New", "Active", "Semi-Active", "Inactive").optional(),
  notes:              Joi.string().max(2000).allow(null, "").optional(),
};

exports.createMemberSchema = Joi.object(memberBody);

exports.updateMemberSchema = Joi.object({
  ...memberBody,
  first_name: Joi.string().max(100).optional(),
  last_name:  Joi.string().max(100).optional(),
}).min(1);

exports.createEmergencyContactSchema = Joi.object({
  name:         Joi.string().max(150).required(),
  relationship: Joi.string().max(100).allow(null, "").optional(),
  phone:        Joi.string().max(30).allow(null, "").optional(),
  email:        Joi.string().email().max(150).allow(null, "").optional(),
});

exports.updateEmergencyContactSchema = Joi.object({
  name:         Joi.string().max(150).optional(),
  relationship: Joi.string().max(100).allow(null, "").optional(),
  phone:        Joi.string().max(30).allow(null, "").optional(),
  email:        Joi.string().email().max(150).allow(null, "").optional(),
}).min(1);

exports.createMemberNoteSchema = Joi.object({
  note: Joi.string().max(2000).required(),
});

exports.createMemberStatusHistorySchema = Joi.object({
  status:      Joi.string().valid("New", "Active", "Semi-Active", "Inactive").required(),
  change_date: Joi.date().iso().optional(),
  remarks:     Joi.string().max(500).allow(null, "").optional(),
});

exports.createInviteSchema = Joi.object({
  first_name:    Joi.string().max(100).required(),
  last_name:     Joi.string().max(100).required(),
  email:         Joi.string().email().max(150).allow(null, "").optional(),
  phone:         Joi.string().max(30).allow(null, "").optional(),
  invited_by:    Joi.number().integer().positive().allow(null).optional(),
  invited_date:  Joi.date().iso().allow(null).optional(),
  notes:         Joi.string().max(500).allow(null, "").optional(),
});

// ── Query parameter schemas for GET endpoints ──────────────────
exports.getMembersQuerySchema = Joi.object({
  page:         Joi.number().integer().min(1).default(1),
  limit:        Joi.number().integer().min(1).max(100).default(20),
  search:       Joi.string().max(200).allow("").optional(),
  status:       Joi.string().valid("New", "Active", "Semi-Active", "Inactive").optional(),
  cell_group_id: Joi.number().integer().positive().optional(),
  group_id:     Joi.number().integer().positive().optional(),
});

exports.linkMemberAccountSchema = Joi.object({
  email:    Joi.string().email().max(150).required(),
  password: Joi.string().min(8).max(128).required(),
});