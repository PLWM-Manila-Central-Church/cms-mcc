"use strict";

const Joi = require("joi");
const { INVENTORY_STATUSES } = require("../helpers/inventoryStatus.helper");

exports.createItemSchema = Joi.object({
  name:        Joi.string().max(150).required(),
  category_id: Joi.number().integer().positive().allow(null).optional(),
  quantity:    Joi.number().integer().min(0).required(),
  unit:        Joi.string().max(50).allow(null, "").optional(),
  condition:   Joi.string().valid("Good", "Fair", "Poor", "For Disposal").allow(null, "").optional(),
  status:      Joi.string().valid(...INVENTORY_STATUSES).optional(),
  low_stock_threshold: Joi.number().integer().min(0).allow(null).optional(),
  notes:       Joi.string().max(5000).allow(null, "").optional(),
  // Accepted for legacy clients; these values are not inventory-item columns.
  description: Joi.string().max(500).allow(null, "").optional(),
  location:    Joi.string().max(200).allow(null, "").optional(),
});

exports.updateItemSchema = Joi.object({
  name:        Joi.string().max(150).optional(),
  category_id: Joi.number().integer().positive().allow(null).optional(),
  quantity:    Joi.number().integer().min(0).optional(),
  unit:        Joi.string().max(50).allow(null, "").optional(),
  condition:   Joi.string().valid("Good", "Fair", "Poor", "For Disposal").allow(null, "").optional(),
  status:      Joi.string().valid(...INVENTORY_STATUSES).optional(),
  low_stock_threshold: Joi.number().integer().min(0).allow(null).optional(),
  notes:       Joi.string().max(5000).allow(null, "").optional(),
  description: Joi.string().max(500).allow(null, "").optional(),
  location:    Joi.string().max(200).allow(null, "").optional(),
}).min(1);

exports.createRequestSchema = Joi.object({
  item_id:     Joi.number().integer().positive().required(),
  quantity:    Joi.number().integer().positive().required(),
  request_key: Joi.string().trim().min(8).max(64).pattern(/^[A-Za-z0-9-]+$/).optional(),
  purpose:     Joi.string().max(255).allow(null, "").optional(),
  event_id:    Joi.number().integer().positive().optional(),
  service_id:  Joi.number().integer().positive().optional(),
  ministry_role_id: Joi.number().integer().positive().optional(),
}).oxor("event_id", "service_id", "ministry_role_id");

exports.reviewRequestSchema = Joi.object({
  status:      Joi.string().valid("approved", "rejected").required(),
  review_note: Joi.string().max(500).allow(null, "").optional(),
});

exports.createUsageSchema = Joi.object({
  item_id:        Joi.number().integer().positive().required(),
  quantity_used:  Joi.number().integer().positive().optional(),
  quantity:       Joi.number().integer().positive().optional(),
  used_for:       Joi.string().max(300).allow(null, "").optional(),
  used_at:        Joi.date().iso().allow(null).optional(),
  used_date:      Joi.date().iso().allow(null).optional(),
}).xor("quantity_used", "quantity").oxor("used_at", "used_date");

exports.getUsageQuerySchema = Joi.object({
  page:  Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(15),
});

exports.createCategorySchema = Joi.object({
  name:        Joi.string().max(100).required(),
  description: Joi.string().max(300).allow(null, "").optional(),
});

exports.updateCategorySchema = Joi.object({
  name:        Joi.string().max(100).optional(),
  description: Joi.string().max(300).allow(null, "").optional(),
}).min(1);

// ── Query parameter schemas for GET endpoints ──────────────────
exports.getItemsQuerySchema = Joi.object({
  page:        Joi.number().integer().min(1).default(1),
  limit:       Joi.number().integer().min(1).max(100).default(15),
  search:      Joi.string().max(200).allow("").optional(),
  category_id: Joi.number().integer().positive().optional(),
  status:      Joi.string().valid(...INVENTORY_STATUSES).optional(),
});

exports.getRequestsQuerySchema = Joi.object({
  page:   Joi.number().integer().min(1).default(1),
  limit:  Joi.number().integer().min(1).max(100).default(15),
  status: Joi.string().valid("pending", "approved", "rejected").optional(),
});
