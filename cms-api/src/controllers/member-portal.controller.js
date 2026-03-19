"use strict";

const portalService = require("../services/member-portal.service");

// ── Profile ──────────────────────────────────────────────────
exports.getMyProfile = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.getMyProfile(req.user.memberId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateMyProfile = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.updateMyProfile(req.user.memberId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Attendance ───────────────────────────────────────────────
exports.getMyAttendance = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.getMyAttendance(req.user.memberId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Finance ──────────────────────────────────────────────────
exports.getMyFinance = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.getMyFinance(req.user.memberId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Events ───────────────────────────────────────────────────
exports.getMyEvents = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.getMyEvents(req.user.memberId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.registerForEvent = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.registerForEvent(req.user.memberId, req.params.eventId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.cancelEventRegistration = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.cancelEventRegistration(req.user.memberId, req.params.eventId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Password ─────────────────────────────────────────────────
exports.changeMyPassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const data = await portalService.changeMyPassword(
      req.user.userId, current_password, new_password
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getUpcomingServices = async (req, res, next) => {
  try {
    const data = await portalService.getUpcomingServices();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded" });
    const relativePath = `/profiles/${req.file.filename}`;
    const data = await portalService.uploadProfilePhoto(req.user.memberId, relativePath);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Ministry ─────────────────────────────────────────────────
exports.getMyAssignments = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.getMyAssignments(req.user.memberId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.confirmMinistryAssignment = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.confirmMinistryAssignment(
      req.user.memberId, req.params.assignmentId
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
