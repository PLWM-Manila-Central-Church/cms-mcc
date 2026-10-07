"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/attendance.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const { createAttendanceSchema, updateAttendanceSchema } = require("../validators/attendance.validator");
const validateQuery = require("../middlewares/validateQuery");
const pastorAttendanceCtrl = require("../controllers/pastor-attendance.controller");
const {
  pastorAttendanceReportQuerySchema,
  pastorMemberHistoryQuerySchema,
  pastorMemberSearchQuerySchema,
} = require("../validators/pastor-attendance.validator");

router.get("/pastor-report/members", auth, authorize("attendance", "read"), validateQuery(pastorMemberSearchQuerySchema), pastorAttendanceCtrl.searchMembers);
router.get("/pastor-report/members/:memberId/history", auth, authorize("attendance", "read"), validateQuery(pastorMemberHistoryQuerySchema), pastorAttendanceCtrl.getMemberHistory);
router.get("/pastor-report/export.csv", auth, authorize("attendance", "read"), validateQuery(pastorAttendanceReportQuerySchema), pastorAttendanceCtrl.exportReport);
router.get("/pastor-report", auth, authorize("attendance", "read"), validateQuery(pastorAttendanceReportQuerySchema), pastorAttendanceCtrl.getReport);
router.get("/",    auth, authorize("attendance", "read"),   ctrl.getAllAttendance);
router.get("/:id", auth, authorize("attendance", "read"),   ctrl.getAttendanceById);
router.post("/",   auth, authorize("attendance", "create"), validate(createAttendanceSchema), ctrl.createAttendance);
router.put("/:id", auth, authorize("attendance", "update"), validate(updateAttendanceSchema), ctrl.updateAttendance);
router.delete("/:id", auth, authorize("attendance", "delete"), ctrl.deleteAttendance);

module.exports = router;
