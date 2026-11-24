"use strict";

const router = require("express").Router();
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const svc = require("../services/lifeMinistries.service");
const engSvc = require("../services/ministryEngagement.service");
const { getScope } = require("../helpers/scopedLeader.helper");

// Allow members:update OR scoped group leader (single group scope) on their own group
const authorizeGroupEngagementWrite = (req, res, next) => {
  if (req.user?.roleName === "Group Leader" && req.user?.leadsGroupId) return next();
  if (req.user?.roleName === "Leader") {
    const scope = getScope(req.user);
    if (scope && scope.type === "group" && scope.id) return next();
  }
  return authorize("members", "update")(req, res, next);
};

// Pastoral care (prayer responses & visitations) also permits Pastor
const authorizePastoralCareWrite = (req, res, next) => {
  if (req.user?.roleName === "Pastor") return next();
  return authorizeGroupEngagementWrite(req, res, next);
};

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

router.post("/:id/activities", auth, authorizeGroupEngagementWrite, async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.createActivity(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/activities/:activityId/attendance", auth, authorizeGroupEngagementWrite, async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.recordActivityAttendance(req.params.activityId, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/activities/:activityId/import-service", auth, authorizeGroupEngagementWrite, async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.importAttendanceFromService(req.params.id, req.params.activityId, req.body.service_id, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/announcements", auth, authorizeGroupEngagementWrite, async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.createAnnouncement(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/messages", auth, authorizeGroupEngagementWrite, async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.sendMessage({ ...req.body, ministry_group_id: Number(req.params.id), direction: "leader_to_member" }, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/feedback/:feedbackId/respond", auth, authorizePastoralCareWrite, async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.respondToFeedback(req.params.feedbackId, req.body, req.user, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/visitations", auth, authorizePastoralCareWrite, async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.createVisitation({ ...req.body, ministry_group_id: Number(req.params.id) }, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch("/:id/visitations/:visitId/stage", auth, authorizePastoralCareWrite, async (req, res, next) => {
  try {
    await svc.getMinistryDetail(req.params.id, req.user);
    const data = await engSvc.updateVisitationStage(req.params.visitId, req.body.care_stage, req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
