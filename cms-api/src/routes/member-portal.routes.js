"use strict";

const router = require("express").Router();
const ctrl   = require("../controllers/member-portal.controller");
const auth   = require("../middlewares/verifyToken");
const multer = require("multer");
const path   = require("path");
const crypto = require("crypto");
const fs     = require("fs");

const PROFILES_DIR = path.join(__dirname, "../../uploads/profiles");
if (!fs.existsSync(PROFILES_DIR)) fs.mkdirSync(PROFILES_DIR, { recursive: true });

const profileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, PROFILES_DIR),
  filename:    (_req,  file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomBytes(16).toString("hex")}${ext}`);
  },
});

const profileUpload = multer({
  storage: profileStorage,
  limits:  { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = [".jpg", ".jpeg", ".png", ".webp"];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error("Only image files are allowed (jpg, jpeg, png, webp)"));
  },
});

router.get   ("/profile",                                    auth, ctrl.getMyProfile);
router.put   ("/profile",                                    auth, ctrl.updateMyProfile);
router.post  ("/profile/photo",                              auth, profileUpload.single("photo"), ctrl.uploadProfilePhoto);

router.get   ("/attendance",                                 auth, ctrl.getMyAttendance);
router.get   ("/finance",                                    auth, ctrl.getMyFinance);

router.get   ("/events",                                     auth, ctrl.getMyEvents);
router.post  ("/events/:eventId/register",                   auth, ctrl.registerForEvent);
router.delete("/events/:eventId/register",                   auth, ctrl.cancelEventRegistration);

router.get   ("/services",                                   auth, ctrl.getUpcomingServices);
router.get   ("/services/:serviceId",                        auth, ctrl.getServiceDetails);
router.post  ("/services/:serviceId/respond",                auth, ctrl.submitServiceResponse);

router.post  ("/change-password",                            auth, ctrl.changeMyPassword);

router.get   ("/ministry-assignments",                       auth, ctrl.getMyAssignments);
router.post  ("/ministry-assignments/:assignmentId/confirm", auth, ctrl.confirmMinistryAssignment);

module.exports = router;
