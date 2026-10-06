"use strict";
const router = require("express").Router();
const ctrl = require("../controllers/dashboard.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

router.get("/stats", auth, authorize("dashboard", "read"), ctrl.getStats);
module.exports = router;
