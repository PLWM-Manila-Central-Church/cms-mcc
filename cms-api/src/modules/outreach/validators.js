"use strict";
const Joi = require("joi");
const id = Joi.number().integer().positive();
const template = Joi.string().trim().min(10).max(480).custom((value, helpers) => {
  const invalid = [...value.matchAll(/\{\{([^}]+)\}\}/g)].some((match) => !["first_name", "activity", "date", "time", "venue"].includes(match[1]));
  return invalid ? helpers.message("Use only first_name, activity, date, time and venue placeholders") : value;
});
const collection = {
  page: Joi.number().integer().min(1).default(1), limit: Joi.number().integer().min(1).max(100).default(25),
  search: Joi.string().trim().max(80).allow("").default(""),
};
const dateOnly = Joi.string().pattern(/^\d{4}-\d{2}-\d{2}$/).custom((value, helpers) => {
  const date = new Date(value + "T00:00:00Z");
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value ? helpers.error("string.pattern.base") : value;
}).allow("");
module.exports = {
  collection: Joi.object(collection),
  campaigns: Joi.object({
    ...collection,
    status: Joi.string().valid("draft", "pending_approval", "approved", "scheduled", "sending", "completed", "rejected", "cancelled", "failed").allow("").default(""),
  }),
  cases: Joi.object({ ...collection, status: Joi.string().valid("open", "assigned", "resolved", "cancelled").allow("") }),
  deliveries: Joi.object({ ...collection, channel: Joi.string().valid("sms", "in_app").allow(""),
    status: Joi.string().valid("queued", "processing", "simulated", "sent", "delivered", "failed", "unknown", "cancelled", "skipped").allow(""),
    follow_up_id: id, date_from: dateOnly, date_to: dateOnly }).custom((value, helpers) =>
    value.date_from && value.date_to && value.date_from > value.date_to ? helpers.message("Start date must be on or before end date") : value),
  configuration: Joi.object({
    enabled: Joi.boolean(), mode: Joi.string().valid("disabled", "simulation", "live"),
    reminder_days: Joi.array().items(Joi.number().integer().min(1).max(30)).unique().min(1).max(5),
    reminder_hour: Joi.number().integer().min(0).max(23), daily_sms_cap: Joi.number().integer().min(1).max(100),
    reminder_template: template, followup_template: template,
    campaigns_enabled: Joi.boolean(),
    campaign_unit_cost_php: Joi.number().min(0).max(100),
    campaign_monthly_budget_php: Joi.number().min(0).max(1000000),
    campaign_weekly_member_cap: Joi.number().integer().min(1).max(20),
    campaign_monthly_member_cap: Joi.number().integer().min(1).max(100),
    campaign_approval_recipient_threshold: Joi.number().integer().min(1).max(10000),
    campaign_approval_cost_threshold: Joi.number().min(0).max(100000),
    campaign_quiet_start: Joi.number().integer().min(0).max(23),
    campaign_quiet_end: Joi.number().integer().min(1).max(23),
  }).min(1),
  campaignPreview: Joi.object({
    scheduled_at: Joi.date().iso(),
    audience_type: Joi.string().valid("event", "ministry", "cell_group", "all_members", "selected_members").required(),
    event_id: id.allow(null), ministry_id: id.allow(null), cell_group_id: id.allow(null),
    member_ids: Joi.when("audience_type", { is: "selected_members", then: Joi.array().items(id).min(1).max(1000).required(), otherwise: Joi.forbidden() }),
    timing_mode: Joi.string().valid("send_now", "scheduled").default("scheduled"),
    message: template.required(),
  }),
  campaign: Joi.object({
    title: Joi.string().trim().min(3).max(150).required(),
    audience_type: Joi.string().valid("event", "ministry", "cell_group", "all_members", "selected_members").required(),
    event_id: id.allow(null), ministry_id: id.allow(null), cell_group_id: id.allow(null),
    member_ids: Joi.when("audience_type", { is: "selected_members", then: Joi.array().items(id).min(1).max(1000).required(), otherwise: Joi.forbidden() }),
    timing_mode: Joi.string().valid("send_now", "scheduled").default("scheduled"),
    message: template.required(),
    scheduled_at: Joi.when("timing_mode", { is: "send_now", then: Joi.forbidden(), otherwise: Joi.date().iso().greater("now").required() }),
    submission_key: Joi.string().guid().optional(),
    window_end: Joi.date().iso().greater(Joi.ref("scheduled_at")).allow(null),
    budget_cap_php: Joi.number().min(0).max(1000000).allow(null),
    acknowledge_cost: Joi.boolean().default(false),
  }),
  campaignReason: Joi.object({ reason: Joi.string().trim().min(5).max(500).required() }),
  campaignNote: Joi.object({ note: Joi.string().trim().max(500).allow("").default("") }),
  preference: Joi.object({
    phone: Joi.string().max(30).allow(""), sms_enabled: Joi.boolean().required(), activity_reminders: Joi.boolean().required(),
    attendance_followups: Joi.boolean().required(), campaign_notifications: Joi.boolean(),
    consent_confirmed: Joi.boolean().default(false),
    consent_note: Joi.string().trim().min(5).max(500).allow(""),
    guardian_name: Joi.string().trim().max(120).allow(""), guardian_phone: Joi.string().max(30).allow(""),
    guardian_consent_confirmed: Joi.boolean().default(false), guardian_consent_note: Joi.string().trim().max(500).allow(""),
  }),
  policy: Joi.object({ reminders_enabled: Joi.boolean().required(), followups_enabled: Joi.boolean().required(),
    series_key: Joi.string().trim().pattern(/^[a-z0-9_-]{1,80}$/).required(), expected_revision: Joi.number().integer().min(0).required() }),
  exception: Joi.object({ status: Joi.string().valid("excused", "pending", "cleared").required(), reason: Joi.string().trim().min(5).max(500).required() }),
  assign: Joi.object({ assigned_to: id.required(), expected_revision: id.required(), note: Joi.string().trim().min(5).max(1000).required() }),
  resolve: Joi.object({ expected_revision: id.required(), note: Joi.string().trim().min(5).max(1000).required() }),
  evaluate: Joi.object({ cursor: Joi.number().integer().min(0).default(0) }),
  process: Joi.object({ limit: Joi.number().integer().min(1).max(100).default(25) }),
  empty: Joi.object({}),
};
