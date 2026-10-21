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
    const data = await portalService.getMyFinance(req.user.memberId, req.query);
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
    const data = await portalService.registerForEvent(req.user.memberId, req.params.eventId, req.body || {});
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateEventReservation = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.updateEventRegistrationReservation(
      req.user.memberId,
      req.params.eventId,
      req.body,
      req.user.userId,
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.cancelEventRegistration = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.cancelEventRegistration(req.user.memberId, req.params.eventId, req.user.userId);
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
    // Store a stable storage key. The client resolves it through the authenticated
    // /uploads route for both local disk and object storage.
    const storageKey = req.file.key || `profiles/${req.file.filename}`;
    const filePath = `/${storageKey}`;
    const data = await portalService.uploadProfilePhoto(req.user.memberId, filePath);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getServiceDetails = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.getServiceDetails(req.params.serviceId, req.user.memberId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.submitServiceResponse = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.submitServiceResponse(
      req.user.memberId, req.params.serviceId, req.body
    );
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

exports.getMyMinistryInvites = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(400).json({ message: "No member profile linked to this account" });
    const data = await portalService.getMyMinistryInvites(req.user.memberId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
