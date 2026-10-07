"use strict";

const Joi = require("joi");

const dateOnly = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    return helpers.error("date.format");
  }
  return value;
}).messages({ "date.format": "Use a valid YYYY-MM-DD date." });

exports.pastorMemberSearchQuerySchema = Joi.object({
  search: Joi.string().trim().min(2).max(100).required(),
  limit: Joi.number().integer().min(1).max(20).default(10),
});

exports.pastorMemberHistoryQuerySchema = Joi.object({
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  activity_type: Joi.string().valid("all", "service", "event").default("all"),
  mode: Joi.string().valid("all", "active", "history").default("all"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(25),
}).custom((value, helpers) => {
  if (value.from && value.to && value.from > value.to) return helpers.error("date.range");
  return value;
}).messages({ "date.range": "The history start date must be on or before its end date." });

exports.pastorAttendanceReportQuerySchema = Joi.object({
  from: dateOnly.optional(),
  to: dateOnly.optional(),
  activity_type: Joi.string().valid("all", "service", "event").default("all"),
  activity_id: Joi.number().integer().positive().optional(),
  session_id: Joi.number().integer().positive().optional(),
  mode: Joi.string().valid("all", "active", "history").default("all"),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(50).default(20),
}).custom((value, helpers) => {
  if (value.from && value.to && value.from > value.to) return helpers.error("date.range");
  if (value.activity_id && value.activity_type === "all") return helpers.error("activity.typeRequired");
  return value;
}).messages({
  "date.range": "The report start date must be on or before its end date.",
  "activity.typeRequired": "Choose Service or Event before filtering to a specific activity.",
});
