"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/service-extras.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const authorizeMemberSubstituteSelfService = require("../middlewares/authorizeMemberSubstituteSelfService");
const validate = require("../middlewares/validate");
const { createAttendanceSchema } = require("../validators/attendance.validator");
const { createServiceResponseSchema, createServiceResponseAliasSchema } = require("../validators/services.validator");
const { createSubstituteRequestSchema } = require("../validators/substituteRequests.validator");

// ── Attendance Summary ───────────────────────────────────────
router.get("/summary/:serviceId", auth, authorize("services", "read"),   ctrl.getSummaryByService);
router.put("/summary/:serviceId", auth, authorize("services", "update"), ctrl.upsertSummary);

// ── Service Responses (canonical) ───────────────────────────
router.get("/responses/:serviceId",  auth, authorize("services", "read"),   ctrl.getResponsesByService);
router.post("/responses/:serviceId", auth, authorize("services", "create"), validate(createServiceResponseSchema), ctrl.createOrUpdateResponse);

// ── Service Responses alias (frontend uses /:id/responses) ──
router.get("/:id/responses",  auth, authorize("services", "read"),   ctrl.getResponsesByServiceAlias);
router.post("/:id/responses", auth, authorize("services", "create"), validate(createServiceResponseAliasSchema), ctrl.createOrUpdateResponseAlias);

// ── Attendance by Service (frontend uses /:id/attendance) ───
router.get("/:id/attendance",              auth, authorize("attendance", "read"),   ctrl.getAttendanceByService);
router.post("/:id/attendance", auth, authorize("attendance", "create"), validate(createAttendanceSchema), ctrl.createAttendanceForService);
router.patch("/:id/attendance/:memberId/archive", auth, authorize("attendance", "delete"), ctrl.archiveAttendanceForService);

// ── Substitute Requests ──────────────────────────────────────
// /mine MUST come before /substitutes/:id to avoid being shadowed
router.get("/substitutes/mine",           auth, authorizeMemberSubstituteSelfService, ctrl.getMySubstituteRequests);
router.get("/substitutes/eligible-services", auth, authorizeMemberSubstituteSelfService, ctrl.getEligibleSubstituteServices);
router.get("/substitutes/replacements", auth, authorizeMemberSubstituteSelfService, ctrl.getEligibleSubstituteReplacements);
router.get("/substitutes",                auth, authorize("ministry", "read"),   ctrl.getAllSubstituteRequests);
router.get("/substitutes/:id",            auth, authorize("ministry", "read"),   ctrl.getSubstituteRequestById);
router.post("/substitutes",               auth, authorizeMemberSubstituteSelfService, validate(createSubstituteRequestSchema), ctrl.createSubstituteRequest);
router.put("/substitutes/:id/resolve",    auth, authorize("ministry", "update"), ctrl.resolveSubstituteRequest);

module.exports = router;
