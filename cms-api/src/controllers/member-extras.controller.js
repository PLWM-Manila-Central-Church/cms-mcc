"use strict";

const memberExtrasService = require("../services/member-extras.service");

// ── Emergency Contacts ───────────────────────────────────────
exports.getEmergencyContacts = async (req, res, next) => {
  try {
    const data = await memberExtrasService.getEmergencyContacts(req.params.memberId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createEmergencyContact = async (req, res, next) => {
  try {
    const data = await memberExtrasService.createEmergencyContact(req.params.memberId, req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateEmergencyContact = async (req, res, next) => {
  try {
    const data = await memberExtrasService.updateEmergencyContact(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteEmergencyContact = async (req, res, next) => {
  try {
    const data = await memberExtrasService.deleteEmergencyContact(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Member Notes ─────────────────────────────────────────────
exports.getMemberNotes = async (req, res, next) => {
  try {
    const data = await memberExtrasService.getMemberNotes(req.params.memberId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createMemberNote = async (req, res, next) => {
  try {
    const data = await memberExtrasService.createMemberNote(req.params.memberId, req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteMemberNote = async (req, res, next) => {
  try {
    const data = await memberExtrasService.deleteMemberNote(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Member Status History ────────────────────────────────────
exports.getMemberStatusHistory = async (req, res, next) => {
  try {
    const data = await memberExtrasService.getMemberStatusHistory(req.params.memberId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createMemberStatusHistory = async (req, res, next) => {
  try {
    const data = await memberExtrasService.createMemberStatusHistory(req.params.memberId, req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Invited Members ──────────────────────────────────────────
exports.getAllInvites = async (req, res, next) => {
  try {
    const data = await memberExtrasService.getAllInvites();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getInviteById = async (req, res, next) => {
  try {
    const data = await memberExtrasService.getInviteById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createInvite = async (req, res, next) => {
  try {
    const data = await memberExtrasService.createInvite(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteInvite = async (req, res, next) => {
  try {
    const data = await memberExtrasService.deleteInvite(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
