"use strict";

const eventsService = require("../services/events.service");

// ── Events ───────────────────────────────────────────────────
exports.getAllEvents = async (req, res, next) => {
  try {
    const result = await eventsService.getAllEvents(req.query);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getEventById = async (req, res, next) => {
  try {
    const result = await eventsService.getEventById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.createEvent = async (req, res, next) => {
  try {
    const result = await eventsService.createEvent(req.body, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateEvent = async (req, res, next) => {
  try {
    const result = await eventsService.updateEvent(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateEventStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const result = await eventsService.updateEventStatus(req.params.id, status, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    const result = await eventsService.deleteEvent(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── Event Categories ─────────────────────────────────────────
exports.getAllCategories = async (req, res, next) => {
  try {
    const result = await eventsService.getAllCategories();
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getCategoryById = async (req, res, next) => {
  try {
    const result = await eventsService.getCategoryById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.createCategory = async (req, res, next) => {
  try {
    const result = await eventsService.createCategory(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    const result = await eventsService.updateCategory(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    const result = await eventsService.deleteCategory(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── Event Registrations ──────────────────────────────────────
exports.getEventRegistrations = async (req, res, next) => {
  try {
    const result = await eventsService.getEventRegistrations(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// Self-register or admin register a specific member (member_id in body)
exports.registerMember = async (req, res, next) => {
  try {
    const memberId = req.body.member_id || req.user.memberId;
    if (!memberId)
      return res.status(400).json({ success: false, message: "No member profile linked to this account" });
    const result = await eventsService.registerMember(req.params.id, memberId, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// Bulk register — body: { member_ids: [1, 2, 3] }
exports.bulkRegisterMembers = async (req, res, next) => {
  try {
    const { member_ids } = req.body;
    if (!Array.isArray(member_ids) || member_ids.length === 0)
      return res.status(400).json({ success: false, message: "member_ids must be a non-empty array" });
    const result = await eventsService.bulkRegisterMembers(req.params.id, member_ids, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// Self-unregister (no memberId in path)
exports.unregisterMember = async (req, res, next) => {
  try {
    const memberId = req.body.member_id || req.user.memberId;
    if (!memberId)
      return res.status(400).json({ success: false, message: "No member profile linked to this account" });
    const result = await eventsService.unregisterMember(req.params.id, memberId, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// Admin remove specific member by memberId URL param
exports.unregisterMemberById = async (req, res, next) => {
  try {
    const memberId = parseInt(req.params.memberId, 10);
    if (!memberId)
      return res.status(400).json({ success: false, message: "Invalid member ID" });
    const result = await eventsService.unregisterMember(req.params.id, memberId, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
