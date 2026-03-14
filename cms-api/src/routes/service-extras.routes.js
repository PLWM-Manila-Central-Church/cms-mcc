"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/service-extras.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

// ── Attendance Summary ───────────────────────────────────────
router.get("/summary/:serviceId", auth, authorize("services", "read"),   ctrl.getSummaryByService);
router.put("/summary/:serviceId", auth, authorize("services", "update"), ctrl.upsertSummary);

// ── Service Responses (canonical) ───────────────────────────
router.get("/responses/:serviceId",  auth, authorize("services", "read"),   ctrl.getResponsesByService);
router.post("/responses/:serviceId", auth, authorize("services", "create"), ctrl.createOrUpdateResponse);
router.delete("/responses/:id",      auth, authorize("services", "delete"), ctrl.deleteResponse);

// ── Service Responses alias (frontend uses /:id/responses) ──
router.get("/:id/responses",  auth, authorize("services", "read"),   ctrl.getResponsesByServiceAlias);
router.post("/:id/responses", auth, authorize("services", "create"), ctrl.createOrUpdateResponseAlias);

// ── Attendance by Service (frontend uses /:id/attendance) ───
router.get("/:id/attendance",              auth, authorize("attendance", "read"),   ctrl.getAttendanceByService);
router.post("/:id/attendance",             auth, authorize("attendance", "create"), ctrl.createAttendanceForService);
router.delete("/:id/attendance/:memberId", auth, authorize("attendance", "delete"), ctrl.deleteAttendanceForService);

// ── Substitute Requests ──────────────────────────────────────
router.get("/substitutes",          auth, authorize("ministry", "read"),   ctrl.getAllSubstituteRequests);
router.get("/substitutes/:id",      auth, authorize("ministry", "read"),   ctrl.getSubstituteRequestById);
router.post("/substitutes",         auth, authorize("services", "create"), ctrl.createSubstituteRequest);
router.put("/substitutes/:id/resolve", auth, authorize("ministry", "update"), ctrl.resolveSubstituteRequest);
router.delete("/substitutes/:id",   auth, authorize("ministry", "delete"), ctrl.deleteSubstituteRequest);

module.exports = router;
