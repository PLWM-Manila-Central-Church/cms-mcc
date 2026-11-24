"use strict";

const router = require("express").Router();
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const svc = require("../services/lifeMinistries.service");
const engSvc = require("../services/ministryEngagement.service");

router.get("/", auth, authorize("members", "read"), async (req, res, next) => {
  try {
    const data = await svc.listMinistries(req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get("/:id", auth, authorize("members", "read"), async (req, res, next) => {
  try {
    const data = await svc.getMinistryDetail(req.params.id, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/", auth, authorize("members", "create"), async (req, res, next) => {
  try {
    const data = await svc.createMinistry(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.put("/:id", auth, authorize("members", "update"), async (req, res, next) => {
  try {
    const data = await svc.updateMinistry(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/archive", auth, authorize("members", "delete"), async (req, res, next) => {
  try {
    const data = await svc.archiveMinistry(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ── Phase 5: Ministry Engagement (Activities, RSVP vs Actual Attendance, Announcements, Messages, Prayer, Visitations, Reports)
router.get("/:id/engagement", auth, authorize("members", "read"), async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user); // enforces scope
    const data = await engSvc.getMinistryEngagement(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/activities", auth, authorize("members", "update"), async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.createActivity(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/activities/:activityId/attendance", auth, authorize("members", "update"), async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.recordActivityAttendance(req.params.activityId, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/activities/:activityId/import-service", auth, authorize("members", "update"), async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.importAttendanceFromService(req.params.id, req.params.activityId, req.body.service_id, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/announcements", auth, authorize("members", "update"), async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.createAnnouncement(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/messages", auth, authorize("members", "update"), async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.sendMessage({ ...req.body, ministry_group_id: Number(req.params.id), direction: "leader_to_member" }, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/feedback/:feedbackId/respond", auth, authorize("members", "update"), async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.respondToFeedback(req.params.feedbackId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/visitations", auth, authorize("members", "update"), async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.createVisitation({ ...req.body, ministry_group_id: Number(req.params.id) }, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch("/:id/visitations/:visitId/stage", auth, authorize("members", "update"), async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.updateVisitationStage(req.params.visitId, req.body.care_stage);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
