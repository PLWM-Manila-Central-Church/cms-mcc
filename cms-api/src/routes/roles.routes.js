"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/roles.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const { createRoleSchema, updateRoleSchema } = require("../validators/roles.validator");

// Public list endpoint (any authenticated user — needed for user creation form)
router.get("/list", auth, ctrl.listRoles);

router.get("/",    auth, authorize("roles", "read"),   ctrl.getAllRoles);
router.get("/:id", auth, authorize("roles", "read"),   ctrl.getRoleById);
router.post("/",   auth, authorize("roles", "create"), validate(createRoleSchema), ctrl.createRole);
router.put("/:id", auth, authorize("roles", "update"), validate(updateRoleSchema), ctrl.updateRole);
router.delete("/:id", auth, authorize("roles", "delete"), ctrl.deleteRole);

module.exports = router;
