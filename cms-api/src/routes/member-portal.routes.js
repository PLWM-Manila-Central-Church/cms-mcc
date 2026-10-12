"use strict";

const router = require("express").Router();
const ctrl   = require("../controllers/member-portal.controller");
const auth   = require("../middlewares/verifyToken");
const { profileUpload, requireDurableUploadStorage } = require("../middlewares/upload-s3");
const validate = require("../middlewares/validate");
const { updateProfileSchema, getMyFinanceQuerySchema, submitServiceResponseSchema, registerForEventSchema, updateEventReservationSchema, changePasswordSchema, respondToInviteSchema } = require("../validators/member-portal.validator");
const validateQuery = require("../middlewares/validateQuery");

router.get   ("/profile",                                    auth, ctrl.getMyProfile);
router.put   ("/profile",                                    auth, validate(updateProfileSchema), ctrl.updateMyProfile);
router.post  ("/profile/photo",                              auth, requireDurableUploadStorage, profileUpload.single("photo"), ctrl.uploadProfilePhoto);

router.get   ("/attendance",                                 auth, ctrl.getMyAttendance);
router.get   ("/finance",                                    auth, validateQuery(getMyFinanceQuerySchema), ctrl.getMyFinance);

router.get   ("/events",                                     auth, ctrl.getMyEvents);
router.post  ("/events/:eventId/register",                   auth, validate(registerForEventSchema), ctrl.registerForEvent);
router.patch ("/events/:eventId/reservation",                auth, validate(updateEventReservationSchema), ctrl.updateEventReservation);
router.delete("/events/:eventId/register",                   auth, ctrl.cancelEventRegistration);

router.get   ("/services",                                   auth, ctrl.getUpcomingServices);
router.get   ("/services/:serviceId",                        auth, ctrl.getServiceDetails);
router.post  ("/services/:serviceId/respond",                auth, validate(submitServiceResponseSchema), ctrl.submitServiceResponse);

router.post  ("/change-password",                            auth, validate(changePasswordSchema), ctrl.changeMyPassword);

router.get   ("/ministry-assignments",                       auth, ctrl.getMyAssignments);
router.post  ("/ministry-assignments/:assignmentId/confirm", auth, ctrl.confirmMinistryAssignment);

router.get   ("/ministry-invites",                           auth, ctrl.getMyMinistryInvites);

module.exports = router;
