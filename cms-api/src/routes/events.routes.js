"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/events.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const {
  createEventSchema, updateEventSchema, updateEventStatusSchema,
  registerMemberSchema, bulkRegisterSchema,
} = require("../validators/events.validator");

// ── Event Categories (MUST be before /:id) ───────────────────
router.get("/categories",        auth, authorize("events", "read"),   ctrl.getAllCategories);
router.get("/categories/:id",    auth, authorize("events", "read"),   ctrl.getCategoryById);
router.post("/categories",       auth, authorize("events", "create"), ctrl.createCategory);
router.put("/categories/:id",    auth, authorize("events", "update"), ctrl.updateCategory);
router.delete("/categories/:id", auth, authorize("events", "delete"), ctrl.deleteCategory);

// ── Events ───────────────────────────────────────────────────
router.get("/",    auth, authorize("events", "read"),   ctrl.getAllEvents);
router.get("/:id", auth, authorize("events", "read"),   ctrl.getEventById);
router.post("/",   auth, authorize("events", "create"), validate(createEventSchema),       ctrl.createEvent);
router.put("/:id", auth, authorize("events", "update"), validate(updateEventSchema),       ctrl.updateEvent);
router.patch("/:id/status", auth, authorize("events", "update"), validate(updateEventStatusSchema), ctrl.updateEventStatus);
router.delete("/:id",       auth, authorize("events", "delete"), ctrl.deleteEvent);

// ── Event Registrations ──────────────────────────────────────
router.get("/:id/registrations",              auth, authorize("events", "read"),   ctrl.getEventRegistrations);
router.post("/:id/registrations",             auth, authorize("events", "create"), validate(registerMemberSchema), ctrl.registerMember);
router.post("/:id/registrations/bulk",        auth, authorize("events", "create"), validate(bulkRegisterSchema),   ctrl.bulkRegisterMembers);
router.delete("/:id/registrations",           auth, authorize("events", "delete"), ctrl.unregisterMember);
router.delete("/:id/registrations/:memberId", auth, authorize("events", "delete"), ctrl.unregisterMemberById);

module.exports = router;
