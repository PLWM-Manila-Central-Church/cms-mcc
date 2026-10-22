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

const authorizeEventImageRead = authorize("events", "read");
const allowVisibleMemberEventImage = (req, res, next) => {
  if (req.user?.roleName === "Member") return next();
  return authorizeEventImageRead(req, res, next);
};

// ── Event Categories (MUST be before /:id) ───────────────────
router.get("/categories",        auth, authorize("events", "read"),   ctrl.getAllCategories);
router.get("/categories/:id",    auth, authorize("events", "read"),   ctrl.getCategoryById);
router.post("/categories",       auth, authorize("events", "create"), ctrl.createCategory);
router.put("/categories/:id",    auth, authorize("events", "update"), ctrl.updateCategory);

// ── Events ───────────────────────────────────────────────────
router.get("/:id/image", auth, allowVisibleMemberEventImage, ctrl.getEventImage);
router.post("/:id/image", auth, ctrl.authorizeEventImageUpload, requireDurableUploadStorage, eventImageUpload.single("image"), ctrl.uploadEventImage);
router.patch("/:id/image/archive", auth, authorize("events", "update"), ctrl.archiveEventImage);
router.get("/",    auth, authorize("events", "read"), validateQuery(getEventsQuerySchema), ctrl.getAllEvents);
router.get("/:id", auth, authorize("events", "read"),   ctrl.getEventById);
router.post("/",   auth, authorize("events", "create"), validate(createEventSchema),       ctrl.createEvent);
router.put("/:id", auth, authorize("events", "update"), validate(updateEventSchema),       ctrl.updateEvent);
router.patch("/:id/status", auth, authorize("events", "update"), validate(updateEventStatusSchema), ctrl.updateEventStatus);
router.patch("/:id/archive", auth, authorize("events", "delete"), ctrl.archiveEvent);

// ── Event Registrations ──────────────────────────────────────
router.get("/:id/registrations",              auth, authorize("events", "read"),   ctrl.getEventRegistrations);
// Attendee management is separate from create/update/delete on the event record itself.
router.post("/:id/registrations",             auth, authorize("event_registrations", "create"), validate(registerMemberSchema), ctrl.registerMember);
router.post("/:id/registrations/bulk",        auth, authorize("event_registrations", "create"), validate(bulkRegisterSchema),   ctrl.bulkRegisterMembers);
router.put("/:id/registrations/:memberId/reservation", auth, authorize("event_registrations", "update"), validate(updateRegistrationReservationSchema), ctrl.updateRegistrationReservation);
router.post("/:id/registrations/cancel-self", auth, ctrl.unregisterMember);
router.post("/:id/registrations/:memberId/cancel", auth, authorize("event_registrations", "delete"), ctrl.unregisterMemberById);

module.exports = router;
