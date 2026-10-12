"use strict";
const Joi = require("joi");
const MEMBER_GENDERS = require("../constants/memberGender");

const passwordSchema = Joi.string()
  .min(8)
  .max(72)
  .pattern(/[A-Z]/, "uppercase")
  .pattern(/[a-z]/, "lowercase")
  .pattern(/[0-9]/, "number")
  .required();

const dateOnly = Joi.string()
  .pattern(/^\d{4}-\d{2}-\d{2}$/)
  .custom((value, helpers) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
      ? value
      : helpers.error("date.format");
  })
  .messages({
    "string.pattern.base": '"{{#label}}" must use YYYY-MM-DD format',
    "date.format": '"{{#label}}" must be a valid calendar date',
  });

exports.updateProfileSchema = Joi.object({
  first_name:        Joi.string().max(100).optional(),
  last_name:         Joi.string().max(100).optional(),
  email:             Joi.string().email().max(150).allow(null, "").optional(),
  phone:             Joi.string().max(20).allow(null, "").optional(),
  address:           Joi.string().max(500).allow(null, "").optional(),
  birthdate:         dateOnly.allow(null, "").optional(),
  spiritual_birthday: dateOnly.allow(null, "").optional(),
  gender:            Joi.string().valid(...MEMBER_GENDERS).allow(null).optional(),
  emergency_contacts: Joi.array().items(Joi.object({
    name:            Joi.string().max(100).required(),
    phone:           Joi.string().max(20).required(),
    relationship:    Joi.string().max(50).required(),
  })).optional(),
}).min(1);

exports.getMyFinanceQuerySchema = Joi.object({
  page:      Joi.number().integer().min(1).default(1),
  limit:     Joi.number().integer().min(1).max(100).default(20),
  date_from: dateOnly.optional(),
  date_to:   dateOnly.optional(),
}).custom((value, helpers) => {
  if (value.date_from && value.date_to && value.date_from > value.date_to) {
    return helpers.error("date.range");
  }
  return value;
}).messages({ "date.range": '"date_from" must be on or before "date_to"' });

exports.submitServiceResponseSchema = Joi.object({
  attendance_status: Joi.string().valid("ATTENDING", "NOT_ATTENDING", "UNDECIDED").required(),
  seat_number:       Joi.number().integer().positive().allow(null, "").optional(),
  parking_slot:      Joi.number().integer().positive().allow(null, "").optional(),
});

const eventReservationFields = {
  seat_number: Joi.number().integer().positive().allow(null, "").optional(),
  parking_slot: Joi.number().integer().positive().allow(null, "").optional(),
};

exports.registerForEventSchema = Joi.object(eventReservationFields);
exports.updateEventReservationSchema = Joi.object(eventReservationFields).min(1);

exports.changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password:     passwordSchema,
});

exports.respondToInviteSchema = Joi.object({
  response_status: Joi.string().valid("pending", "attending", "not_attending").required(),
});
