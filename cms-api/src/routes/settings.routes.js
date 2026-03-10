"use strict";

const router = require("express").Router();
const ctrl   = require("../controllers/settings.controller");
const auth   = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

router.get("/",       auth, authorize("settings", "read"),   ctrl.getAllSettings);
router.get("/:key",   auth, authorize("settings", "read"),   ctrl.getSettingByKey);
router.post("/",      auth, authorize("settings", "create"), ctrl.createSetting);

// PUT /settings          — frontend SettingsPage sends { key: value, ... }
router.put("/",       auth, authorize("settings", "update"), ctrl.bulkUpdateFromObject);
// PUT /settings/bulk     — array format [{ key, value }]
router.put("/bulk",   auth, authorize("settings", "update"), ctrl.bulkUpdateSettings);
// PUT /settings/:key     — single key update
router.put("/:key",   auth, authorize("settings", "update"), ctrl.updateSetting);

router.delete("/:key", auth, authorize("settings", "delete"), ctrl.deleteSetting);

module.exports = router;
