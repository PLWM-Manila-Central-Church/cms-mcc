"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/roles.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

router.get("/", auth, authorize("roles", "read"), ctrl.getAllRoles);
router.get("/:id", auth, authorize("roles", "read"), ctrl.getRoleById);
router.post("/", auth, authorize("roles", "create"), ctrl.createRole);
router.put("/:id", auth, authorize("roles", "update"), ctrl.updateRole);
router.delete("/:id", auth, authorize("roles", "delete"), ctrl.deleteRole);

module.exports = router;
