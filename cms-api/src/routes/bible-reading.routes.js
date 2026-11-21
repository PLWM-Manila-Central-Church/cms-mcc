"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/bible-reading.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

// Reading progress is church-wide member data: only the registration team,
// pastors and administrators may read it.
const REPORT_ROLES = new Set(["System Admin", "Pastor", "Registration Team"]);
const reportRoles = (req, res, next) => (
  REPORT_ROLES.has(req.user?.roleName)
    ? next()
    : res.status(403).json({ message: "This report is limited to the registration team, pastors and administrators." })
);

router.get("/summary", auth, reportRoles, authorize("attendance", "read"), ctrl.getSummary);
router.get("/verses", auth, reportRoles, authorize("attendance", "read"), ctrl.listVerses);
router.post("/verses", auth, reportRoles, authorize("attendance", "read"), ctrl.createVerse);
router.delete("/verses/:id", auth, reportRoles, authorize("attendance", "read"), ctrl.deleteVerse);

module.exports = router;
