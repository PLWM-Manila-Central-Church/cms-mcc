"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/ministry.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

// ── Ministry Roles ───────────────────────────────────────────
router.get("/roles", auth, authorize("ministry", "read"), ctrl.getAllRoles);
router.get("/roles/:id", auth, authorize("ministry", "read"), ctrl.getRoleById);
router.post("/roles", auth, authorize("ministry", "create"), ctrl.createRole);
router.put(
  "/roles/:id",
  auth,
  authorize("ministry", "update"),
  ctrl.updateRole,
);
router.delete(
  "/roles/:id",
  auth,
  authorize("ministry", "delete"),
  ctrl.deleteRole,
);

// ── Ministry Assignments ─────────────────────────────────────
router.get(
  "/assignments",
  auth,
  authorize("ministry", "read"),
  ctrl.getAllAssignments,
);
router.get(
  "/assignments/:id",
  auth,
  authorize("ministry", "read"),
  ctrl.getAssignmentById,
);
router.get(
  "/services/:serviceId/assignments",
  auth,
  authorize("ministry", "read"),
  ctrl.getAssignmentsByService,
);
router.post(
  "/assignments",
  auth,
  authorize("ministry", "create"),
  ctrl.createAssignment,
);
router.put(
  "/assignments/:id",
  auth,
  authorize("ministry", "update"),
  ctrl.updateAssignment,
);
router.delete(
  "/assignments/:id",
  auth,
  authorize("ministry", "delete"),
  ctrl.deleteAssignment,
);

// ── Ministry Leader: Substitute Requests ─────────────────────
router.get(
  "/substitutes/pending",
  auth,
  authorize("ministry", "read"),
  ctrl.getPendingSubstitutes,
);
router.put(
  "/substitutes/:id/resolve",
  auth,
  authorize("ministry", "update"),
  ctrl.resolveSubstitute,
);

module.exports = router;
