"use strict";

const router = require("express").Router();
const ctrl   = require("../controllers/public.controller");

// ── No auth required — public landing page stats ──────────────
router.get("/stats", ctrl.getPublicStats);

module.exports = router;
