"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/services.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const {
  createServiceSchema,
  updateServiceSchema,
  updateServiceStatusSchema,
} = require("../validators/services.validator");

router.get("/", auth, authorize("services", "read"), ctrl.getAllServices);
router.get("/:id", auth, authorize("services", "read"), ctrl.getServiceById);
router.post("/", auth, authorize("services", "create"), validate(createServiceSchema), ctrl.createService);
router.put("/:id", auth, authorize("services", "update"), validate(updateServiceSchema), ctrl.updateService);
router.patch("/:id/status", auth, authorize("services", "update"), validate(updateServiceStatusSchema), ctrl.updateStatus);
router.delete(
  "/:id",
  auth,
  authorize("services", "delete"),
  ctrl.deleteService,
);

module.exports = router;
