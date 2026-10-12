"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/users.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const { createUserSchema, updateUserSchema } = require("../validators/users.validator");
const requireSystemAdministrator = require("../middlewares/requireSystemAdministrator");

router.use(auth, requireSystemAdministrator);

router.get("/",    authorize("users", "read"),   ctrl.getAllUsers);
router.get("/:id", authorize("users", "read"),   ctrl.getUserById);
router.post("/",   authorize("users", "create"), validate(createUserSchema), ctrl.createUser);  // Fix #1
router.put("/:id", authorize("users", "update"), validate(updateUserSchema), ctrl.updateUser);  // Fix #1
router.put("/:id/activate",   authorize("users", "update"), ctrl.activateUser);
router.put("/:id/deactivate", authorize("users", "update"), ctrl.deactivateUser);
router.delete("/:id", authorize("users", "delete"), ctrl.hardDeleteUser);

module.exports = router;
