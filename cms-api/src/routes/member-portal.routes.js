"use strict";

const router = require("express").Router();
const ctrl   = require("../controllers/member-portal.controller");
const auth   = require("../middlewares/verifyToken");

// All routes require a valid token. No authorize() middleware —
// the service layer enforces member_id ownership on every query.

router.get ("/profile",                               auth, ctrl.getMyProfile);
router.put ("/profile",                               auth, ctrl.updateMyProfile);

router.get ("/attendance",                            auth, ctrl.getMyAttendance);

router.get ("/finance",                               auth, ctrl.getMyFinance);

router.get ("/events",                                auth, ctrl.getMyEvents);
router.post("/events/:eventId/register",              auth, ctrl.registerForEvent);
router.delete("/events/:eventId/register",            auth, ctrl.cancelEventRegistration);

router.post("/change-password",                       auth, ctrl.changeMyPassword);

router.get ("/ministry-assignments",                  auth, ctrl.getMyAssignments);
router.post("/ministry-assignments/:assignmentId/confirm", auth, ctrl.confirmMinistryAssignment);

module.exports = router;
