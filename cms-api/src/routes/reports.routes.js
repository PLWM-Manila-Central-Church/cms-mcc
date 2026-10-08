"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/reports.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validateQuery = require("../middlewares/validateQuery");
const analyticsController = require("../controllers/analytics.controller");
const analyticsQuerySchema = require("../validators/analytics.validator");

router.get("/tithing-statement", auth, authorize("finance", "read"), ctrl.tithingStatement);
router.get("/analytics", auth, authorize("dashboard", "read"), validateQuery(analyticsQuerySchema), analyticsController.getAnalytics);

module.exports = router;
