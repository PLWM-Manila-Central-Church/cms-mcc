"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/events.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const validateQuery = require("../middlewares/validateQuery");
const { eventImageUpload, requireDurableUploadStorage } = require("../middlewares/upload-s3");
const {
  createEventSchema, updateEventSchema, updateEventStatusSchema,
  registerMemberSchema, updateRegistrationReservationSchema, bulkRegisterSchema, getEventsQuerySchema,
} = require("../validators/events.validator");

// ── Event Categories (MUST be before /:id) ───────────────────
router.get("/categories",        auth, authorize("events", "read"),   ctrl.getAllCategories);
router.get("/categories/:id",    auth, authorize("events", "read"),   ctrl.getCategoryById);
router.post("/categories",       auth, authorize("events", "create"), ctrl.createCategory);
router.put("/categories/:id",    auth, authorize("events", "update"), ctrl.updateCategory);
router.delete("/categories/:id", auth, authorize("events", "delete"), ctrl.deleteCategory);

// ── Events ───────────────────────────────────────────────────
router.get("/:id/image", auth, authorize("events", "read"), ctrl.getEventImage);
router.post("/:id/image", auth, ctrl.authorizeEventImageUpload, requireDurableUploadStorage, eventImageUpload.single("image"), ctrl.uploadEventImage);
router.delete("/:id/image", auth, authorize("events", "update"), ctrl.deleteEventImage);
router.get("/",    auth, authorize("events", "read"), validateQuery(getEventsQuerySchema), ctrl.getAllEvents);
router.get("/:id", auth, authorize("events", "read"),   ctrl.getEventById);
router.post("/",   auth, authorize("events", "create"), validate(createEventSchema),       ctrl.createEvent);
router.put("/:id", auth, authorize("events", "update"), validate(updateEventSchema),       ctrl.updateEvent);
router.patch("/:id/status", auth, authorize("events", "update"), validate(updateEventStatusSchema), ctrl.updateEventStatus);
router.delete("/:id",       auth, authorize("events", "delete"), ctrl.deleteEvent);

// ── Event Registrations ──────────────────────────────────────
router.get("/:id/registrations",              auth, authorize("events", "read"),   ctrl.getEventRegistrations);
// Attendee management is separate from create/update/delete on the event record itself.
router.post("/:id/registrations",             auth, authorize("event_registrations", "create"), validate(registerMemberSchema), ctrl.registerMember);
router.post("/:id/registrations/bulk",        auth, authorize("event_registrations", "create"), validate(bulkRegisterSchema),   ctrl.bulkRegisterMembers);
router.put("/:id/registrations/:memberId/reservation", auth, authorize("event_registrations", "update"), validate(updateRegistrationReservationSchema), ctrl.updateRegistrationReservation);
router.delete("/:id/registrations",           auth, authorize("event_registrations", "delete"), ctrl.unregisterMember);
router.delete("/:id/registrations/:memberId", auth, authorize("event_registrations", "delete"), ctrl.unregisterMemberById);

module.exports = router;
