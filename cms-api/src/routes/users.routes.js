"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/users.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const { createUserSchema, updateUserSchema } = require("../validators/users.validator");

router.get("/",    auth, authorize("users", "read"),   ctrl.getAllUsers);
router.get("/:id", auth, authorize("users", "read"),   ctrl.getUserById);
router.post("/",   auth, authorize("users", "create"), validate(createUserSchema), ctrl.createUser);  // Fix #1
router.put("/:id", auth, authorize("users", "update"), validate(updateUserSchema), ctrl.updateUser);  // Fix #1
router.put("/:id/activate",   auth, authorize("users", "update"), ctrl.activateUser);
router.put("/:id/deactivate", auth, authorize("users", "update"), ctrl.deactivateUser);
router.delete("/:id", auth, authorize("users", "delete"), ctrl.hardDeleteUser);

module.exports = router;
