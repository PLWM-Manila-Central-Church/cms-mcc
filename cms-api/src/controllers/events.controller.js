"use strict";

const eventsService = require("../services/events.service");
const permissionCache = require("../helpers/permissionCache.helper");
const { Event } = require("../models");

exports.authorizeEventImageUpload = async (req, res, next) => {
  try {
    if (req.user?.roleName === "System Admin") return next();
    if (req.user?.roleName === "Ministry Leader" || req.user?.roleName === "Leader") {
      return res.status(403).json({ success: false, message: "This role cannot upload event images." });
    }
    const event = await Event.findOne({ where: { id: req.params.id, is_deleted: 0 }, attributes: ["created_by"] });
    if (!event) return res.status(404).json({ success: false, message: "Event not found" });
    const permissions = await permissionCache.get(req.user.roleId);
    if (permissions.has("events:update")) return next();
    if (permissions.has("events:create")) {
      if (event && Number(event.created_by) === Number(req.user.userId)) return next();
    }
    return res.status(403).json({ success: false, message: "Access forbidden" });
  } catch (error) { next(error); }
};

const forbidMinistryLeaderEventManage = (req, res) => {
  if (req.user?.roleName !== "Ministry Leader") return false;
  res.status(403).json({
    success: false,
    message: "Ministry Leaders can invite their ministry roster, not manage event records.",
  });
  return true;
};

// ── Events ───────────────────────────────────────────────────
exports.getAllEvents = async (req, res, next) => {
  try {
    const result = await eventsService.getAllEvents(req.query, req.user);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.getEventById = async (req, res, next) => {
  try {
    const result = await eventsService.getEventById(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.createEvent = async (req, res, next) => {
  try {
    if (forbidMinistryLeaderEventManage(req, res)) return;
    const result = await eventsService.createEvent(req.body, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateEvent = async (req, res, next) => {
  try {
    if (forbidMinistryLeaderEventManage(req, res)) return;
    const result = await eventsService.updateEvent(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateEventStatus = async (req, res, next) => {
  try {
    if (forbidMinistryLeaderEventManage(req, res)) return;
    const { status } = req.body;
    const result = await eventsService.updateEventStatus(req.params.id, status, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.deleteEvent = async (req, res, next) => {
  try {
    if (forbidMinistryLeaderEventManage(req, res)) return;
    const result = await eventsService.deleteEvent(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.uploadEventImage = async (req, res, next) => {
  try {
    if (forbidMinistryLeaderEventManage(req, res)) return;
    const data = await eventsService.setEventImage(req.params.id, req.file, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    if (req.file) {
      const key = req.file.key || `event-images/${req.file.filename}`;
      try { await require("../middlewares/upload-s3").deleteStoredFile(key); }
      catch (cleanupError) { require("../helpers/logger").error(cleanupError, "Failed to remove an unused event image upload"); }
    }
    next(err);
  }
};

exports.deleteEventImage = async (req, res, next) => {
  try {
    if (forbidMinistryLeaderEventManage(req, res)) return;
    const data = await eventsService.removeEventImage(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getEventImage = async (req, res, next) => {
  try {
    const imageKey = await eventsService.getEventImageKey(req.params.id);
    await require("../middlewares/upload-s3").sendStoredFile(imageKey, res);
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
    if (forbidMinistryLeaderEventManage(req, res)) return;
    const result = await eventsService.createCategory(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.updateCategory = async (req, res, next) => {
  try {
    if (forbidMinistryLeaderEventManage(req, res)) return;
    const result = await eventsService.updateCategory(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.deleteCategory = async (req, res, next) => {
  try {
    if (forbidMinistryLeaderEventManage(req, res)) return;
    const result = await eventsService.deleteCategory(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── Event Registrations ──────────────────────────────────────
exports.getEventRegistrations = async (req, res, next) => {
  try {
    const result = await eventsService.getEventRegistrations(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};

// Self-register or admin register a specific member (member_id in body)
exports.registerMember = async (req, res, next) => {
  try {
    if (forbidMinistryLeaderEventManage(req, res)) return;
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
    if (forbidMinistryLeaderEventManage(req, res)) return;
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
    if (forbidMinistryLeaderEventManage(req, res)) return;
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
    if (forbidMinistryLeaderEventManage(req, res)) return;
    const memberId = parseInt(req.params.memberId, 10);
    if (!memberId)
      return res.status(400).json({ success: false, message: "Invalid member ID" });
    const result = await eventsService.unregisterMember(req.params.id, memberId, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) { next(err); }
};
