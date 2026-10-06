"use strict";

const Joi = require("joi");
const { MAX_QR_PAYLOAD_LENGTH } = require("./qrPayload");

const timestamp = Joi.string()
  .isoDate()
  .pattern(/(?:Z|[+-]\d{2}:\d{2})$/i)
  .required();

exports.qrPayloadSchema = Joi.object({
  qr_payload: Joi.string().trim().min(1).max(MAX_QR_PAYLOAD_LENGTH).required(),
});

exports.resolveBatchQrSchema = Joi.object({
  session_id: Joi.number().integer().positive().required(),
  qr_payload: Joi.string().trim().min(1).max(MAX_QR_PAYLOAD_LENGTH).required(),
});

exports.memberIdSchema = Joi.object({
  member_id: Joi.number().integer().positive().required(),
});

exports.reissueQrSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required(),
});

exports.expectedMembersSchema = Joi.object({
  member_ids: Joi.array().items(Joi.number().integer().positive()).min(1).max(200).unique().required(),
  reason: Joi.string().trim().min(5).max(500).required(),
});

exports.createSessionSchema = Joi.object({
  target_type: Joi.string().valid("service", "event").required(),
  target_id: Joi.number().integer().positive().required(),
  session_key: Joi.string().trim().max(80).required(),
  title: Joi.string().trim().min(1).max(150).required(),
  starts_at: timestamp,
  ends_at: timestamp,
  check_in_opens_at: timestamp,
  check_in_closes_at: timestamp,
  approval_deadline: timestamp,
  time_zone: Joi.string().trim().max(64).default("Asia/Manila"),
  expected_basis: Joi.string().valid("none", "registrations", "explicit_roster").default("none"),
  registration_required: Joi.boolean().default(false),
  leader_confirmation_mode: Joi.string().valid("direct", "batch_review").default("batch_review"),
}).custom((value, helpers) => {
  if (new Date(value.starts_at) >= new Date(value.ends_at)) {
    return helpers.error("date.range");
  }
  if (new Date(value.check_in_opens_at) > new Date(value.check_in_closes_at)) {
    return helpers.error("date.range");
  }
  if (new Date(value.approval_deadline) < new Date(value.check_in_closes_at)) {
    return helpers.error("date.range");
  }
  if (value.registration_required && value.expected_basis !== "registrations") {
    return helpers.error("any.invalid");
  }
  if (value.registration_required && value.target_type !== "event") {
    return helpers.error("any.invalid");
  }
  if (value.expected_basis === "registrations" && !value.registration_required) {
    return helpers.error("any.invalid");
  }
  return value;
}).messages({
  "date.range": "Session times must be in order, including the approval deadline.",
  "any.invalid": "Registration-based sessions must be Events and require Event registration.",
});

exports.listQuerySchema = Joi.object({
  target_type: Joi.string().valid("service", "event"),
  target_id: Joi.number().integer().positive(),
  status: Joi.string().valid("draft", "open", "closed", "cancelled", "submitted", "approved", "rejected", "withdrawn"),
  limit: Joi.number().integer().min(1).max(100).default(50),
  page: Joi.number().integer().min(1).default(1),
  search: Joi.string().trim().max(80).allow("").default(""),
}).with("target_id", "target_type");

exports.batchDraftSchema = Joi.object({
  client_request_id: Joi.string().guid({ version: ["uuidv4"] }).required(),
});

exports.createBatchSchema = exports.batchDraftSchema;

exports.addBatchItemSchema = Joi.object({
  member_id: Joi.number().integer().positive(),
  qr_payload: Joi.string().trim().min(1).max(MAX_QR_PAYLOAD_LENGTH),
  expected_revision: Joi.number().integer().positive().required(),
}).xor("member_id", "qr_payload");

exports.removeBatchItemSchema = Joi.object({
  expected_revision: Joi.number().integer().positive().required(),
});

exports.rejectBatchSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required(),
  expected_revision: Joi.number().integer().positive().required(),
});

exports.withdrawBatchSchema = Joi.object({
  reason: Joi.string().trim().min(1).max(500).allow("").default(""),
  expected_revision: Joi.number().integer().positive().required(),
});

exports.approveBatchSchema = Joi.object({
  expected_revision: Joi.number().integer().positive().required(),
  content_digest: Joi.string().length(64).hex().required(),
  late_approval: Joi.boolean().default(false),
  late_approval_reason: Joi.string().trim().min(5).max(500).when("late_approval", {
    is: true,
    then: Joi.required(),
    otherwise: Joi.optional().allow(""),
  }),
});

exports.submitBatchSchema = Joi.object({
  expected_revision: Joi.number().integer().positive().required(),
});

exports.directCheckInSchema = Joi.object({
  member_id: Joi.number().integer().positive(),
  qr_payload: Joi.string().trim().min(1).max(MAX_QR_PAYLOAD_LENGTH),
}).xor("member_id", "qr_payload");

exports.cancelSessionSchema = Joi.object({
  reason: Joi.string().trim().min(5).max(500).required(),
});

exports.exportQuerySchema = Joi.object({
  format: Joi.string().valid("csv").default("csv"),
});

exports.correctAttendanceSchema = Joi.object({
  action: Joi.string().valid("void", "reinstate").required(),
  reason: Joi.string().trim().min(5).max(500).required(),
  expected_version: Joi.number().integer().min(0).required(),
});
