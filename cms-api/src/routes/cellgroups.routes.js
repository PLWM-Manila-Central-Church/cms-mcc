"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/cellgroups.controller");
const meetingsSvc = require("../services/cellMeetings.service");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const {
  createCellGroupSchema, updateCellGroupSchema, createCellGroupHistorySchema,
} = require("../validators/cellgroups.validator");

const { getScope, isScopedLeader } = require("../helpers/scopedLeader.helper");
const AppError = require("../helpers/AppError");

const assertCellGroupScope = (cellGroupId, user, { write = false } = {}) => {
  if (!isScopedLeader(user)) return;
  const scope = getScope(user);
  if (!scope) throw AppError.forbidden("No cell group scope is assigned to this account.");
  if (scope.type === "all") {
    if (write) throw AppError.forbidden("Select a single cell group before making changes.");
    const allowedIds = (scope.assignments || []).filter((a) => a.type === "cell_group").map((a) => Number(a.id));
    if (!allowedIds.includes(Number(cellGroupId))) throw AppError.forbidden("Cell group is outside your assigned scope.");
    return;
  }
  if (scope.type !== "cell_group" || Number(scope.id) !== Number(cellGroupId)) {
    throw AppError.forbidden("Cell group is outside your assigned scope.");
  }
};

const authorizeCellMeetingWrite = (req, res, next) => {
  if (req.user?.roleName === "Cell Group Leader" && req.user?.leadsCellGroupId) return next();
  if (req.user?.roleName === "Leader") {
    const scope = getScope(req.user);
    if (scope && scope.type === "cell_group" && scope.id) return next();
  }
  return authorize("cell_groups", "update")(req, res, next);
};

// Health alerts & meetings routes (before /:id catch-all)
router.get("/health-alerts", auth, authorize("cell_groups", "read"), async (req, res, next) => {
  try {
    const data = await meetingsSvc.getCellGroupHealthAlerts(req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.get("/:id/meetings", auth, authorize("cell_groups", "read"), async (req, res, next) => {
  try {
    assertCellGroupScope(req.params.id, req.user, { write: false });
    const data = await meetingsSvc.listMeetings(req.params.id, req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/:id/meetings", auth, authorizeCellMeetingWrite, async (req, res, next) => {
  try {
    assertCellGroupScope(req.params.id, req.user, { write: true });
    const data = await meetingsSvc.createMeeting(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/:id/meetings/:meetingId/attendance", auth, authorizeCellMeetingWrite, async (req, res, next) => {
  try {
    assertCellGroupScope(req.params.id, req.user, { write: true });
    const data = await meetingsSvc.recordMeetingAttendance(req.params.meetingId, req.body.entries || []);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// History routes MUST come before /:id to avoid being shadowed
router.get("/history/:memberId", auth, authorize("cell_groups", "read"),   ctrl.getCellGroupHistory);
router.post("/history",          auth, authorize("cell_groups", "update"), validate(createCellGroupHistorySchema), ctrl.createCellGroupHistory);

// ── Cell Group CRUD ───────────────────────────────────────────
router.get("/",    auth, authorize("cell_groups", "read"),   ctrl.getAllCellGroups);
router.get("/:id", auth, authorize("cell_groups", "read"),   ctrl.getCellGroupById);
router.post("/",   auth, authorize("cell_groups", "create"), validate(createCellGroupSchema), ctrl.createCellGroup);
router.put("/:id", auth, authorize("cell_groups", "update"), validate(updateCellGroupSchema), ctrl.updateCellGroup);
router.patch("/:id/archive", auth, authorize("cell_groups", "delete"), ctrl.archiveCellGroup);

module.exports = router;
