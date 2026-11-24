"use strict";

const ministryService = require("../services/ministry.service");
const ministryScheduleService = require("../services/ministrySchedule.service");

// ── Ministry Roles ───────────────────────────────────────────
const resolveMinistryLeaderScope = (user) => {
  if (user?.roleName !== "Ministry Leader") return null;
  if (!user.leadsMinistryId) return -1; // fail-closed when unassigned
  return Number(user.leadsMinistryId);
};

exports.getAllRoles = async (req, res, next) => {
  try {
    const scope = resolveMinistryLeaderScope(req.user);
    if (scope === -1) return res.json({ success: true, data: [] });
    const data = await ministryService.getAllRoles(scope);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRoleById = async (req, res, next) => {
  try {
    const scope = resolveMinistryLeaderScope(req.user);
    if (scope === -1) return res.status(403).json({ success: false, message: "No ministry is assigned to this account" });
    const data = await ministryService.getRoleById(req.params.id, scope);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createRole = async (req, res, next) => {
  try {
    const data = await ministryService.createRole(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateRole = async (req, res, next) => {
  try {
    const data = await ministryService.updateRole(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.archiveRole = async (req, res, next) => {
  try {
    const data = await ministryService.archiveRole(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
exports.deleteRole = exports.archiveRole;

// ── Ministry Assignments ─────────────────────────────────────
exports.getAllAssignments = async (req, res, next) => {
  try {
    const scope = resolveMinistryLeaderScope(req.user);
    if (scope === -1) return res.json({ success: true, data: [] });
    const data = await ministryService.getAllAssignments(scope);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getAssignmentById = async (req, res, next) => {
  try {
    const scope = resolveMinistryLeaderScope(req.user);
    if (scope === -1) return res.status(403).json({ success: false, message: "No ministry is assigned to this account" });
    const data = await ministryService.getAssignmentById(req.params.id, scope);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getAssignmentsByService = async (req, res, next) => {
  try {
    const scope = resolveMinistryLeaderScope(req.user);
    if (scope === -1) return res.json({ success: true, data: [] });
    const data = await ministryService.getAssignmentsByService(req.params.serviceId, scope);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createAssignment = async (req, res, next) => {
  try {
    const data = await ministryService.createAssignment(req.body, req.user.userId, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const data = await ministryService.updateAssignment(req.params.id, req.body, req.user.userId, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.archiveAssignment = async (req, res, next) => {
  try {
    const data = await ministryService.archiveAssignment(req.params.id, req.user.userId, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Ministry Roster (Ministry Leader only) ───────────────────
exports.searchMembersForRoster = async (req, res, next) => {
  try {
    if (!req.user.leadsMinistryId)
      return res.status(403).json({ message: "You are not a Ministry Leader" });
    const data = await ministryService.searchMembersForRoster(req.query.q || "");
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getMyMinistryMembers = async (req, res, next) => {
  try {
    if (!req.user.leadsMinistryId)
      return res.status(403).json({ message: "You are not a Ministry Leader" });
    const data = await ministryService.getMyMinistryMembers(req.user.leadsMinistryId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.addMemberToMinistry = async (req, res, next) => {
  try {
    if (!req.user.leadsMinistryId)
      return res.status(403).json({ message: "You are not a Ministry Leader" });
    const { member_id } = req.body;
    const data = await ministryService.addMemberToMinistry(
      req.user.leadsMinistryId, member_id, req.user.userId
    );
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.archiveMemberFromMinistry = async (req, res, next) => {
  try {
    if (!req.user.leadsMinistryId)
      return res.status(403).json({ message: "You are not a Ministry Leader" });
    const data = await ministryService.archiveMemberFromMinistry(
      req.user.leadsMinistryId, req.params.memberId, req.user.userId
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Ministry Leader: Substitute Requests ─────────────────────
exports.getPendingSubstitutes = async (req, res, next) => {
  try {
    const user = req.user;
    const ministryId = user.leadsMinistryId;
    if (!ministryId) {
      return res.status(403).json({ message: "You are not a Ministry Leader" });
    }
    const data = await ministryService.getPendingSubstitutes(ministryId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.resolveSubstitute = async (req, res, next) => {
  try {
    const user = req.user;
    const ministryId = user.leadsMinistryId;
    if (!ministryId) {
      return res.status(403).json({ message: "You are not a Ministry Leader" });
    }
    const data = await ministryService.resolveSubstitute(req.params.id, req.body, ministryId, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
// ── Ministry Schedules ───────────────────────────────────────
exports.listSchedules = async (req, res, next) => {
  try {
    if (req.user.roleName === "Ministry Leader") {
      if (!req.user.leadsMinistryId) return res.json({ success: true, data: [] });
      const data = await ministryScheduleService.listForMinistry(req.user.leadsMinistryId);
      return res.json({ success: true, data });
    }
    const data = req.query.ministryRoleId
      ? await ministryScheduleService.listForMinistry(req.query.ministryRoleId)
      : await ministryScheduleService.listForMember(req.user.memberId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createSchedule = async (req, res, next) => {
  try {
    const targetRoleId = req.body.ministry_role_id || req.body.ministryRoleId;
    if (req.user.roleName === "Ministry Leader") {
      if (!req.user.leadsMinistryId || Number(targetRoleId) !== Number(req.user.leadsMinistryId)) {
        return res.status(403).json({ success: false, message: "You can only create schedules for your assigned ministry" });
      }
    }
    const data = await ministryScheduleService.create({
      ministryRoleId: targetRoleId,
      kind: req.body.kind,
      title: req.body.title,
      date: req.body.date,
      startTime: req.body.start_time || req.body.startTime,
      endTime: req.body.end_time || req.body.endTime,
      location: req.body.location,
      notes: req.body.notes,
    }, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteSchedule = async (req, res, next) => {
  try {
    if (req.user.roleName === "Ministry Leader") {
      if (!req.user.leadsMinistryId) {
        return res.status(403).json({ success: false, message: "No ministry is assigned to this account" });
      }
      const { MinistrySchedule } = require("../models");
      const existing = MinistrySchedule?.findByPk ? await MinistrySchedule.findByPk(req.params.id) : null;
      if (existing && Number(existing.ministry_role_id) !== Number(req.user.leadsMinistryId)) {
        return res.status(403).json({ success: false, message: "You can only remove schedules for your assigned ministry" });
      }
    }
    const data = await ministryScheduleService.remove(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
