"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/cellgroups.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const {
  createCellGroupSchema, updateCellGroupSchema, createCellGroupHistorySchema,
} = require("../validators/cellgroups.validator");

// History routes MUST come before /:id to avoid being shadowed
router.get("/history/:memberId", auth, authorize("cellgroups", "read"),   ctrl.getCellGroupHistory);
router.post("/history",          auth, authorize("cellgroups", "update"), validate(createCellGroupHistorySchema), ctrl.createCellGroupHistory);

// ── Cell Group CRUD ───────────────────────────────────────────
router.get("/",    auth, authorize("cellgroups", "read"),   ctrl.getAllCellGroups);
router.get("/:id", auth, authorize("cellgroups", "read"),   ctrl.getCellGroupById);
router.post("/",   auth, authorize("cellgroups", "create"), validate(createCellGroupSchema), ctrl.createCellGroup);
router.put("/:id", auth, authorize("cellgroups", "update"), validate(updateCellGroupSchema), ctrl.updateCellGroup);
router.delete("/:id", auth, authorize("cellgroups", "delete"), ctrl.deleteCellGroup);

module.exports = router;
