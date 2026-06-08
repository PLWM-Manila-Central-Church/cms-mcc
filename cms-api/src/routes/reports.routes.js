"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/reports.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

router.get("/tithing-statement", auth, authorize("finance", "read"), ctrl.tithingStatement);

module.exports = router;