"use strict";
const Joi = require("joi");

const inviteStatuses = ["attending", "not_attending"];

exports.createInvitesSchema = Joi.object({
  ministry_role_id: Joi.number().integer().positive().optional(),
  member_ids: Joi.array().items(Joi.number().integer().positive()).unique().min(1).max(100).required(),
  response_deadline: Joi.date().iso().allow(null).optional(),
});

exports.respondToInviteSchema = Joi.object({
  response_status: Joi.string().valid(...inviteStatuses).required(),
});
