"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/settings.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const { createSettingSchema, updateSettingSchema, bulkUpdateSchema } = require("../validators/settings.validator");

router.get("/",      auth, authorize("settings", "read"),   ctrl.getAllSettings);
router.get("/:key",  auth, authorize("settings", "read"),   ctrl.getSettingByKey);
router.post("/",     auth, authorize("settings", "create"), validate(createSettingSchema), ctrl.createSetting);

// PUT /settings — frontend sends { key: value, ... }
router.put("/",      auth, authorize("settings", "update"), validate(bulkUpdateSchema), ctrl.bulkUpdateFromObject);
// PUT /settings/bulk — array format
router.put("/bulk",  auth, authorize("settings", "update"), ctrl.bulkUpdateSettings);
// PUT /settings/:key — single key update
router.put("/:key",  auth, authorize("settings", "update"), validate(updateSettingSchema), ctrl.updateSetting);

router.delete("/:key", auth, authorize("settings", "delete"), ctrl.deleteSetting);

module.exports = router;
