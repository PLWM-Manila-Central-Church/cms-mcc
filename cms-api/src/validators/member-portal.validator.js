"use strict";
const Joi = require("joi");

const passwordSchema = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[A-Z]/, "uppercase")
  .pattern(/[a-z]/, "lowercase")
  .pattern(/[0-9]/, "number")
  .required();

exports.updateProfileSchema = Joi.object({
  first_name:        Joi.string().max(100).optional(),
  last_name:         Joi.string().max(100).optional(),
  phone:             Joi.string().max(20).allow(null, "").optional(),
  address:           Joi.string().max(500).allow(null, "").optional(),
  birthdate:         Joi.date().iso().allow(null).optional(),
  spiritual_birthday: Joi.date().iso().allow(null).optional(),
  gender:            Joi.string().valid("Male", "Female", "Other", "Prefer not to say").allow(null).optional(),
  emergency_contacts: Joi.array().items(Joi.object({
    name:            Joi.string().max(100).required(),
    phone:           Joi.string().max(20).required(),
    relationship:    Joi.string().max(50).required(),
  })).optional(),
}).min(1);

exports.submitServiceResponseSchema = Joi.object({
  attendance_status: Joi.string().valid("ATTENDING", "NOT_ATTENDING", "UNDECIDED").required(),
  seat_number:       Joi.string().max(10).allow(null, "").optional(),
  parking_slot:      Joi.string().max(10).allow(null, "").optional(),
});

exports.changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password:     passwordSchema,
});

exports.respondToInviteSchema = Joi.object({
  response_status: Joi.string().valid("pending", "attending", "not_attending").required(),
});
