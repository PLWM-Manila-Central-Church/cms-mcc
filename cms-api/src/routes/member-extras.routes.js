"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/member-extras.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

// ── Emergency Contacts ───────────────────────────────────────
router.get(
  "/emergency-contacts/:memberId",
  auth,
  authorize("members", "read"),
  ctrl.getEmergencyContacts,
);
router.post(
  "/emergency-contacts/:memberId",
  auth,
  authorize("members", "create"),
  ctrl.createEmergencyContact,
);
router.put(
  "/emergency-contacts/:id",
  auth,
  authorize("members", "update"),
  ctrl.updateEmergencyContact,
);
router.delete(
  "/emergency-contacts/:id",
  auth,
  authorize("members", "delete"),
  ctrl.deleteEmergencyContact,
);

// ── Member Notes ─────────────────────────────────────────────
router.get(
  "/notes/:memberId",
  auth,
  authorize("members", "read"),
  ctrl.getMemberNotes,
);
router.post(
  "/notes/:memberId",
  auth,
  authorize("members", "create"),
  ctrl.createMemberNote,
);
router.delete(
  "/notes/:id",
  auth,
  authorize("members", "delete"),
  ctrl.deleteMemberNote,
);

// ── Member Status History ────────────────────────────────────
router.get(
  "/status-history/:memberId",
  auth,
  authorize("members", "read"),
  ctrl.getMemberStatusHistory,
);
router.post(
  "/status-history/:memberId",
  auth,
  authorize("members", "update"),
  ctrl.createMemberStatusHistory,
);

// ── Invited Members ──────────────────────────────────────────
router.get("/invites", auth, authorize("members", "read"), ctrl.getAllInvites);
router.get(
  "/invites/:id",
  auth,
  authorize("members", "read"),
  ctrl.getInviteById,
);
router.post(
  "/invites",
  auth,
  authorize("members", "create"),
  ctrl.createInvite,
);
router.delete(
  "/invites/:id",
  auth,
  authorize("members", "delete"),
  ctrl.deleteInvite,
);

module.exports = router;
