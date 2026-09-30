"use strict";
const Joi = require("joi");

const inviteStatuses = ["pending", "attending", "not_attending"];

exports.createInvitesSchema = Joi.object({
  invites: Joi.array().items(Joi.object({
    ministry_role_id: Joi.number().integer().positive().required(),
    member_id:        Joi.number().integer().positive().required(),
    response_deadline: Joi.date().iso().allow(null).optional(),
  })).min(1).max(100).required(),
});

exports.respondToInviteSchema = Joi.object({
  response_status: Joi.string().valid(...inviteStatuses).required(),
});