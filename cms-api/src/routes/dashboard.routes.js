"use strict";
const router = require("express").Router();
const ctrl = require("../controllers/dashboard.controller");
const auth = require("../middlewares/verifyToken");

router.get("/stats", auth, ctrl.getStats);
module.exports = router;