"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/service-extras.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

// ── Attendance Summary ───────────────────────────────────────
router.get(
  "/summary/:serviceId",
  auth,
  authorize("services", "read"),
  ctrl.getSummaryByService,
);
router.put(
  "/summary/:serviceId",
  auth,
  authorize("services", "update"),
  ctrl.upsertSummary,
);

// ── Service Responses ────────────────────────────────────────
router.get(
  "/responses/:serviceId",
  auth,
  authorize("services", "read"),
  ctrl.getResponsesByService,
);
router.post(
  "/responses/:serviceId",
  auth,
  authorize("services", "create"),
  ctrl.createOrUpdateResponse,
);
router.delete(
  "/responses/:id",
  auth,
  authorize("services", "delete"),
  ctrl.deleteResponse,
);

// ── Substitute Requests ──────────────────────────────────────
router.get(
  "/substitutes",
  auth,
  authorize("ministry", "read"),
  ctrl.getAllSubstituteRequests,
);
router.get(
  "/substitutes/:id",
  auth,
  authorize("ministry", "read"),
  ctrl.getSubstituteRequestById,
);
router.post(
  "/substitutes",
  auth,
  authorize("services", "create"),
  ctrl.createSubstituteRequest,
);
router.put(
  "/substitutes/:id/resolve",
  auth,
  authorize("ministry", "update"),
  ctrl.resolveSubstituteRequest,
);
router.delete(
  "/substitutes/:id",
  auth,
  authorize("ministry", "delete"),
  ctrl.deleteSubstituteRequest,
);

module.exports = router;
