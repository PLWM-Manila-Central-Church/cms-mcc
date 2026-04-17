"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/attendance.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const { createAttendanceSchema, updateAttendanceSchema } = require("../validators/attendance.validator");

router.get("/",    auth, authorize("attendance", "read"),   ctrl.getAllAttendance);
router.get("/:id", auth, authorize("attendance", "read"),   ctrl.getAttendanceById);
router.post("/",   auth, authorize("attendance", "create"), validate(createAttendanceSchema), ctrl.createAttendance);
router.put("/:id", auth, authorize("attendance", "update"), validate(updateAttendanceSchema), ctrl.updateAttendance);
router.delete("/:id", auth, authorize("attendance", "delete"), ctrl.deleteAttendance);

module.exports = router;
