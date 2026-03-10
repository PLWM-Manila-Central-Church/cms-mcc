"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/audit.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

router.get("/", auth, authorize("audit", "read"), ctrl.getAllLogs);
router.get(
  "/user/:userId",
  auth,
  authorize("audit", "read"),
  ctrl.getLogsByUser,
);
router.get(
  "/table/:table",
  auth,
  authorize("audit", "read"),
  ctrl.getLogsByTable,
);
router.get("/:id", auth, authorize("audit", "read"), ctrl.getLogById);

module.exports = router;
