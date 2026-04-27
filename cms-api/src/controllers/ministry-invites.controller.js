"use strict";

const invitesService = require("../services/ministry-invites.service");

// ── Get Invites for an Event ─────────────────────────────────
// Ministry Leaders see only their ministry's invites.
// System Admin / Pastor / Reg Team (no leadsMinistryId) see all.
exports.getInvitesByEvent = async (req, res, next) => {
  try {
    const leadsMinistryId = req.user.leadsMinistryId || null;
    const data = await invitesService.getInvitesByEvent(
      req.params.eventId,
      leadsMinistryId,
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Create Invites (bulk) ────────────────────────────────────
// Only a Ministry Leader may create invites (must have leadsMinistryId).
exports.createInvites = async (req, res, next) => {
  try {
    if (!req.user.leadsMinistryId)
      return res.status(403).json({ success: false, message: "You are not a Ministry Leader" });

    const data = await invitesService.createInvites(
      req.params.eventId,
      req.body,
      req.user.userId,
    );
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Respond to Invite (member self-service) ──────────────────
// The portal member responds to their own invite via their memberId.
exports.respondToInvite = async (req, res, next) => {
  try {
    if (!req.user.memberId)
      return res.status(403).json({ success: false, message: "No member profile linked to this account" });

    const { response_status } = req.body;
    const data = await invitesService.respondToInvite(
      req.params.inviteId,
      req.user.memberId,
      response_status,
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
