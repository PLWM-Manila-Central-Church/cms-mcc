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

const { VisitorRecord } = require("../models");
const AppError = require("../helpers/AppError");
const auditLog = require("../helpers/auditLog.helper");

router.get("/visitors", auth, authorize("attendance", "read"), async (req, res, next) => {
  try {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 50));
    const where = { is_deleted: 0 };
    if (req.query.service_id) where.service_id = Number(req.query.service_id);
    if (req.query.event_id) where.event_id = Number(req.query.event_id);
    if (req.query.visit_type) where.visit_type = req.query.visit_type;
    const rows = await VisitorRecord.findAll({
      where,
      order: [["visit_date", "DESC"], ["id", "DESC"]],
      limit,
    });
    res.json({ success: true, data: rows });
  } catch (err) { next(err); }
});

router.post("/visitors", auth, authorize("attendance", "create"), async (req, res, next) => {
  try {
    const fullName = String(req.body.full_name || "").trim();
    if (!fullName) throw AppError.badRequest("VALIDATION_ERROR", "Visitor full name is required.");
    const created = await VisitorRecord.create({
      service_id: req.body.service_id || null,
      event_id: req.body.event_id || null,
      full_name: fullName,
      phone: req.body.phone || null,
      email: req.body.email || null,
      visit_type: req.body.visit_type === "returning" ? "returning" : "first_time",
      visit_date: req.body.visit_date || new Date().toISOString().slice(0, 10),
      invited_by_member_id: req.body.invited_by_member_id || null,
      notes: req.body.notes || null,
      recorded_by: req.user.userId,
    });
    auditLog.log({ userId: req.user.userId, action: "RECORD_VISITOR", targetTable: "visitor_records", targetId: created.id });
    res.status(201).json({ success: true, data: created });
  } catch (err) { next(err); }
});

router.patch("/visitors/:id/status", auth, authorize("attendance", "update"), async (req, res, next) => {
  try {
    const allowed = ["pending", "contacted", "integrated"];
    if (!allowed.includes(req.body.follow_up_status)) {
      throw AppError.badRequest("VALIDATION_ERROR", "Invalid follow-up status.");
    }
    const row = await VisitorRecord.findOne({ where: { id: req.params.id, is_deleted: 0 } });
    if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Visitor record not found");
    await row.update({ follow_up_status: req.body.follow_up_status });
    res.json({ success: true, data: row });
  } catch (err) { next(err); }
});

router.get("/pastor-report/members", auth, authorize("attendance", "read"), validateQuery(pastorMemberSearchQuerySchema), pastorAttendanceCtrl.searchMembers);
router.get("/pastor-report/members/:memberId/history", auth, authorize("attendance", "read"), validateQuery(pastorMemberHistoryQuerySchema), pastorAttendanceCtrl.getMemberHistory);
router.get("/pastor-report/export.csv", auth, authorize("attendance", "read"), validateQuery(pastorAttendanceReportQuerySchema), pastorAttendanceCtrl.exportReport);
router.get("/pastor-report", auth, authorize("attendance", "read"), validateQuery(pastorAttendanceReportQuerySchema), pastorAttendanceCtrl.getReport);
router.get("/",    auth, authorize("attendance", "read"),   ctrl.getAllAttendance);
router.get("/:id", auth, authorize("attendance", "read"),   ctrl.getAttendanceById);
router.post("/",   auth, authorize("attendance", "create"), validate(createAttendanceSchema), ctrl.createAttendance);
router.put("/:id", auth, authorize("attendance", "update"), validate(updateAttendanceSchema), ctrl.updateAttendance);
router.patch("/:id/archive", auth, authorize("attendance", "delete"), ctrl.archiveAttendance);

module.exports = router;
