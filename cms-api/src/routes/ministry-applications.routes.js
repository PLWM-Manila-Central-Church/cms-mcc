"use strict";

const router = require("express").Router();
const controller = require("../controllers/ministry-applications.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const validateQuery = require("../middlewares/validateQuery");
const {
  createApplicationSchema,
  reviewApplicationSchema,
  listApplicationsQuerySchema,
} = require("../validators/ministry-applications.validator");

router.get("/opportunities", auth, authorize("ministry_applications", "apply"), controller.getOpportunities);
router.get("/mine", auth, authorize("ministry_applications", "apply"), controller.getMine);
router.post("/", auth, authorize("ministry_applications", "apply"), validate(createApplicationSchema), controller.create);
router.delete("/:id", auth, authorize("ministry_applications", "apply"), controller.withdraw);
router.get("/", auth, authorize("ministry_applications", "read"), validateQuery(listApplicationsQuerySchema), controller.list);
router.patch("/:id/review", auth, authorize("ministry_applications", "review"), validate(reviewApplicationSchema), controller.review);

module.exports = router;
