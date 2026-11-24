"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/reports.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validateQuery = require("../middlewares/validateQuery");
const analyticsController = require("../controllers/analytics.controller");
const registrationController = require("../controllers/registrationAnalytics.controller");
const analyticsQuerySchema = require("../validators/analytics.validator");

router.get("/tithing-statement", auth, authorize("finance", "read"), ctrl.tithingStatement);
router.get("/analytics", auth, authorize("dashboard", "read"), validateQuery(analyticsQuerySchema), analyticsController.getAnalytics);
router.get("/team-attendance", auth, authorize("attendance", "read"), validateQuery(analyticsQuerySchema), analyticsController.getTeamAttendance);

// ── Registration analytics (Registration Team and above) ────
const REGISTRATION_REPORT_ROLES = new Set(["System Admin", "Pastor", "Registration Team"]);
const requireRegistrationReportRole = (req, res, next) => (
  REGISTRATION_REPORT_ROLES.has(req.user?.roleName)
    ? next()
    : res.status(403).json({ success: false, message: "Registration analytics is limited to Registration Team, Pastor, and System Admin." })
);

router.get("/registration", auth, requireRegistrationReportRole, authorize("attendance", "read"), registrationController.getOverview);
router.get("/registration/events/:id", auth, requireRegistrationReportRole, authorize("attendance", "read"), registrationController.getEvent);

module.exports = router;
