"use strict";

const router = require("express").Router();
const ctrl   = require("../controllers/ministry-invites.controller");
const auth   = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const { createInvitesSchema, respondToInviteSchema } = require("../validators/ministry-invites.validator");

// ── Ministry Event Invites ───────────────────────────────────
// Mounted at /api/events in app.js — paths are relative to that.

// GET  /api/events/:eventId/invites
// Ministry Leader: scoped to their ministry. Others: all invites for the event.
router.get(
  "/:eventId/invites",
  auth,
  authorize("events", "read"),
  ctrl.getInvitesByEvent,
);

// POST /api/events/:eventId/invites
// Ministry Leader only (guard enforced in controller).
router.post(
  "/:eventId/invites",
  auth,
  authorize("events", "invite"),
  validate(createInvitesSchema),
  ctrl.createInvites,
);

// PATCH /api/events/invites/:inviteId/respond
// Member self-service — no permission needed beyond being authenticated
// and having a linked member profile (guard enforced in controller).
router.patch(
  "/invites/:inviteId/respond",
  auth,
  validate(respondToInviteSchema),
  ctrl.respondToInvite,
);

module.exports = router;
