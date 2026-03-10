"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/services.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

router.get("/", auth, authorize("services", "read"), ctrl.getAllServices);
router.get("/:id", auth, authorize("services", "read"), ctrl.getServiceById);
router.post("/", auth, authorize("services", "create"), ctrl.createService);
router.put("/:id", auth, authorize("services", "update"), ctrl.updateService);
router.delete(
  "/:id",
  auth,
  authorize("services", "delete"),
  ctrl.deleteService,
);

module.exports = router;
