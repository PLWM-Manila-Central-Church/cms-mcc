"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/cellgroups.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

router.get("/", auth, authorize("cellgroups", "read"), ctrl.getAllCellGroups);
router.get(
  "/:id",
  auth,
  authorize("cellgroups", "read"),
  ctrl.getCellGroupById,
);
router.post("/", auth, authorize("cellgroups", "create"), ctrl.createCellGroup);
router.put(
  "/:id",
  auth,
  authorize("cellgroups", "update"),
  ctrl.updateCellGroup,
);
router.delete(
  "/:id",
  auth,
  authorize("cellgroups", "delete"),
  ctrl.deleteCellGroup,
);
router.get(
  "/history/:memberId",
  auth,
  authorize("cellgroups", "read"),
  ctrl.getCellGroupHistory,
);
router.post(
  "/history",
  auth,
  authorize("cellgroups", "update"),
  ctrl.createCellGroupHistory,
);

module.exports = router;
