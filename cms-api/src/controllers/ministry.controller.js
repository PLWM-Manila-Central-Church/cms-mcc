"use strict";

const ministryService = require("../services/ministry.service");

// ── Ministry Roles ───────────────────────────────────────────
exports.getAllRoles = async (req, res, next) => {
  try {
    const data = await ministryService.getAllRoles();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getRoleById = async (req, res, next) => {
  try {
    const data = await ministryService.getRoleById(req.params.id);
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

exports.deleteRole = async (req, res, next) => {
  try {
    const data = await ministryService.deleteRole(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Ministry Assignments ─────────────────────────────────────
exports.getAllAssignments = async (req, res, next) => {
  try {
    const data = await ministryService.getAllAssignments();
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getAssignmentById = async (req, res, next) => {
  try {
    const data = await ministryService.getAssignmentById(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getAssignmentsByService = async (req, res, next) => {
  try {
    const data = await ministryService.getAssignmentsByService(req.params.serviceId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createAssignment = async (req, res, next) => {
  try {
    const data = await ministryService.createAssignment(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.updateAssignment = async (req, res, next) => {
  try {
    const data = await ministryService.updateAssignment(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteAssignment = async (req, res, next) => {
  try {
    const data = await ministryService.deleteAssignment(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Ministry Roster (Ministry Leader only) ───────────────────
exports.searchMembersForRoster = async (req, res, next) => {
  try {
    if (!req.user.ministryRoleId)
      return res.status(403).json({ message: "You are not a Ministry Leader" });
    const data = await ministryService.searchMembersForRoster(req.query.q || "");
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getMyMinistryMembers = async (req, res, next) => {
  try {
    if (!req.user.ministryRoleId)
      return res.status(403).json({ message: "You are not a Ministry Leader" });
    const data = await ministryService.getMyMinistryMembers(req.user.ministryRoleId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.addMemberToMinistry = async (req, res, next) => {
  try {
    if (!req.user.ministryRoleId)
      return res.status(403).json({ message: "You are not a Ministry Leader" });
    const { member_id } = req.body;
    const data = await ministryService.addMemberToMinistry(
      req.user.ministryRoleId, member_id, req.user.userId
    );
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.removeMemberFromMinistry = async (req, res, next) => {
  try {
    if (!req.user.ministryRoleId)
      return res.status(403).json({ message: "You are not a Ministry Leader" });
    const data = await ministryService.removeMemberFromMinistry(
      req.user.ministryRoleId, req.params.memberId
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

// ── Ministry Leader: Substitute Requests ─────────────────────
exports.getPendingSubstitutes = async (req, res, next) => {
  try {
    const user = req.user;
    const ministryId = user.leads_ministry_id || user.leads_cell_group_id || user.leads_group_id;
    if (!ministryId) {
      return res.status(403).json({ message: "You are not a leader" });
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
    const ministryId = user.leads_ministry_id || user.leads_cell_group_id || user.leads_group_id;
    if (!ministryId) {
      return res.status(403).json({ message: "You are not a leader" });
    }
    const data = await ministryService.resolveSubstitute(req.params.id, req.body, ministryId, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
