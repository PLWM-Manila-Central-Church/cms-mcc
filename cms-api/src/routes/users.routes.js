"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/users.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

router.get("/", auth, authorize("users", "read"), ctrl.getAllUsers);
router.get("/:id", auth, authorize("users", "read"), ctrl.getUserById);
router.post("/", auth, authorize("users", "create"), ctrl.createUser);
router.put("/:id/activate",   auth, authorize("users", "update"), ctrl.activateUser);
router.put("/:id/deactivate", auth, authorize("users", "deactivate"), ctrl.deactivateUser);
router.put("/:id", auth, authorize("users", "update"), ctrl.updateUser);
router.delete("/:id", auth, authorize("users", "delete"), ctrl.deactivateUser);

module.exports = router;
