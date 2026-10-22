"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/member-extras.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const {
  createEmergencyContactSchema, updateEmergencyContactSchema,
  createMemberNoteSchema,
  createMemberStatusHistorySchema,
  createInviteSchema,
} = require("../validators/members.validator");

// ── Emergency Contacts ───────────────────────────────────────
router.get("/emergency-contacts/:memberId",  auth, authorize("members", "read"),   ctrl.getEmergencyContacts);
router.post("/emergency-contacts/:memberId", auth, authorize("members", "update"), validate(createEmergencyContactSchema), ctrl.createEmergencyContact);
router.put("/emergency-contacts/:id",        auth, authorize("members", "update"), validate(updateEmergencyContactSchema), ctrl.updateEmergencyContact);
router.patch("/emergency-contacts/:id/archive", auth, authorize("members", "update"), ctrl.archiveEmergencyContact);

// Path aliases (MemberProfilePage calls /:memberId/emergency-contacts)
router.post("/:memberId/emergency-contacts", auth, authorize("members", "update"), validate(createEmergencyContactSchema), ctrl.createEmergencyContact);
router.patch("/:memberId/emergency-contacts/:id/archive", auth, authorize("members", "update"), ctrl.archiveEmergencyContact);

// ── Member Notes ─────────────────────────────────────────────
router.get("/notes/:memberId",  auth, authorize("members", "read"),   ctrl.getMemberNotes);
router.post("/notes/:memberId", auth, authorize("members", "create"), validate(createMemberNoteSchema), ctrl.createMemberNote);

// ── Member Status History ────────────────────────────────────
router.get("/status-history/:memberId",  auth, authorize("members", "read"),   ctrl.getMemberStatusHistory);
router.post("/status-history/:memberId", auth, authorize("members", "update"), validate(createMemberStatusHistorySchema), ctrl.createMemberStatusHistory);

// ── Invited Members ──────────────────────────────────────────
router.get("/invites",    auth, authorize("members", "read"),   ctrl.getAllInvites);
router.get("/invites/:id", auth, authorize("members", "read"),  ctrl.getInviteById);
router.post("/invites",   auth, authorize("members", "create"), validate(createInviteSchema), ctrl.createInvite);

module.exports = router;
