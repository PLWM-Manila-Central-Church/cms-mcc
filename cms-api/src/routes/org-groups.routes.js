"use strict";

const router = require("express").Router();
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const svc = require("../services/orgGroups.service");

router.get("/", auth, authorize("ministry", "read"), async (req, res, next) => {
  try {
    const data = await svc.listGroups(req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get("/:id", auth, authorize("ministry", "read"), async (req, res, next) => {
  try {
    const data = await svc.getGroupDetail(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/", auth, authorize("ministry", "create"), async (req, res, next) => {
  try {
    const data = await svc.createGroup(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.put("/:id", auth, authorize("ministry", "update"), async (req, res, next) => {
  try {
    const data = await svc.updateGroup(req.params.id, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/positions", auth, authorize("ministry", "update"), async (req, res, next) => {
  try {
    const data = await svc.createPosition(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/positions/:posId/archive", auth, authorize("ministry", "update"), async (req, res, next) => {
  try {
    const data = await svc.archivePosition(req.params.id, req.params.posId, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/member-positions", auth, authorize("ministry", "update"), async (req, res, next) => {
  try {
    const data = await svc.assignMemberPosition(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/activities", auth, authorize("ministry", "update"), async (req, res, next) => {
  try {
    const data = await svc.createActivity(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/tasks", auth, authorize("ministry", "update"), async (req, res, next) => {
  try {
    const data = await svc.createTask(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch("/:id/tasks/:taskId/status", auth, authorize("ministry", "update"), async (req, res, next) => {
  try {
    const data = await svc.updateTaskStatus(req.params.id, req.params.taskId, req.body.status, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
