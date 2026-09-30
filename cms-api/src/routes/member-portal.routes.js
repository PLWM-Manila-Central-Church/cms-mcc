"use strict";

const router = require("express").Router();
const ctrl   = require("../controllers/member-portal.controller");
const auth   = require("../middlewares/verifyToken");
const { profileUpload } = require("../middlewares/upload-s3");
const validate = require("../middlewares/validate");
const { updateProfileSchema, submitServiceResponseSchema, changePasswordSchema, respondToInviteSchema } = require("../validators/member-portal.validator");

router.get   ("/profile",                                    auth, ctrl.getMyProfile);
router.put   ("/profile",                                    auth, validate(updateProfileSchema), ctrl.updateMyProfile);
router.post  ("/profile/photo",                              auth, profileUpload.single("photo"), ctrl.uploadProfilePhoto);

router.get   ("/attendance",                                 auth, ctrl.getMyAttendance);
router.get   ("/finance",                                    auth, ctrl.getMyFinance);

router.get   ("/events",                                     auth, ctrl.getMyEvents);
router.post  ("/events/:eventId/register",                   auth, ctrl.registerForEvent);
router.delete("/events/:eventId/register",                   auth, ctrl.cancelEventRegistration);

router.get   ("/services",                                   auth, ctrl.getUpcomingServices);
router.get   ("/services/:serviceId",                        auth, ctrl.getServiceDetails);
router.post  ("/services/:serviceId/respond",                auth, validate(submitServiceResponseSchema), ctrl.submitServiceResponse);

router.post  ("/change-password",                            auth, validate(changePasswordSchema), ctrl.changeMyPassword);

router.get   ("/ministry-assignments",                       auth, ctrl.getMyAssignments);
router.post  ("/ministry-assignments/:assignmentId/confirm", auth, ctrl.confirmMinistryAssignment);

router.get   ("/ministry-invites",                           auth, ctrl.getMyMinistryInvites);

module.exports = router;
