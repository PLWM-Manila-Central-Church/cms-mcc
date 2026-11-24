"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/services.controller");
const programSvc = require("../services/servicePrograms.service");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate = require("../middlewares/validate");
const {
  createServiceSchema,
  updateServiceSchema,
  updateServiceStatusSchema,
} = require("../validators/services.validator");

// ── Phase 6: Recurrence Rules, Program Builder & Servant Conflict Checks (before /:id)
router.get("/recurrence", auth, authorize("services", "read"), async (req, res, next) => {
  try {
    const data = await programSvc.listRecurrenceRules();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/recurrence", auth, authorize("services", "create"), async (req, res, next) => {
  try {
    const data = await programSvc.createRecurrenceRule(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/recurrence/:ruleId/generate", auth, authorize("services", "create"), async (req, res, next) => {
  try {
    const data = await programSvc.generateFromRule(req.params.ruleId, req.body.weeks || 4, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});
router.get("/:id/program", auth, authorize("services", "read"), async (req, res, next) => {
  try {
    const data = await programSvc.getServiceProgram(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/:id/program", auth, authorize("services", "update"), async (req, res, next) => {
  try {
    const data = await programSvc.addProgramItem(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/:id/program/:itemId/archive", auth, authorize("services", "update"), async (req, res, next) => {
  try {
    const data = await programSvc.archiveProgramItem(req.params.id, req.params.itemId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.get("/:id/servants", auth, authorize("services", "read"), async (req, res, next) => {
  try {
    const data = await programSvc.getServiceServantsWithConflicts(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/:id/servants/:assignId/confirm", auth, authorize("services", "update"), async (req, res, next) => {
  try {
    const data = await programSvc.updateServantConfirmation(req.params.assignId, req.body);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get("/", auth, authorize("services", "read"), ctrl.getAllServices);
router.get("/:id", auth, authorize("services", "read"), ctrl.getServiceById);
router.post("/", auth, authorize("services", "create"), validate(createServiceSchema), ctrl.createService);
router.put("/:id", auth, authorize("services", "update"), validate(updateServiceSchema), ctrl.updateService);
router.patch("/:id/status", auth, authorize("services", "update"), validate(updateServiceStatusSchema), ctrl.updateStatus);
router.patch("/:id/archive", auth, authorize("services", "delete"), ctrl.archiveService);

module.exports = router;
