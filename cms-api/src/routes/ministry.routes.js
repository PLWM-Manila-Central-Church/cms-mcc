"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/ministry.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const {
  createRoleSchema, updateRoleSchema,
  createAssignmentSchema, updateAssignmentSchema,
} = require("../validators/ministry.validator");

// ── Ministry Roles ───────────────────────────────────────────
router.get("/roles",        auth, authorize("ministry", "read"),   ctrl.getAllRoles);
router.get("/roles/:id",    auth, authorize("ministry", "read"),   ctrl.getRoleById);
router.post("/roles",       auth, authorize("ministry", "create"), validate(createRoleSchema), ctrl.createRole);
router.put("/roles/:id",    auth, authorize("ministry", "update"), validate(updateRoleSchema), ctrl.updateRole);
router.delete("/roles/:id", auth, authorize("ministry", "delete"), ctrl.deleteRole);

// ── Ministry Assignments ─────────────────────────────────────
router.get("/assignments",                     auth, authorize("ministry", "read"),   ctrl.getAllAssignments);
router.get("/assignments/:id",                 auth, authorize("ministry", "read"),   ctrl.getAssignmentById);
router.get("/services/:serviceId/assignments", auth, authorize("ministry", "read"),   ctrl.getAssignmentsByService);
router.post("/assignments",                    auth, authorize("ministry", "create"), validate(createAssignmentSchema), ctrl.createAssignment);
router.put("/assignments/:id",                 auth, authorize("ministry", "update"), validate(updateAssignmentSchema), ctrl.updateAssignment);
router.delete("/assignments/:id",              auth, authorize("ministry", "delete"), ctrl.deleteAssignment);

module.exports = router;
