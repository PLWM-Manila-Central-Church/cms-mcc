"use strict";

const { Op } = require("sequelize");
const membersService = require("../services/members.service");
const AppError       = require("../helpers/AppError");
const { getScope, getUnifiedAssignments } = require("../helpers/scopedLeader.helper");

exports.getAllMembers = async (req, res, next) => {
  try {
    const result = await membersService.getAllMembers(req.query, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.getMemberById = async (req, res, next) => {
  try {
    const result = await membersService.getMemberById(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.createMember = async (req, res, next) => {
  try {
    const result = await membersService.createMember(req.body, req.user.userId, req.user);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateMember = async (req, res, next) => {
  try {
    const result = await membersService.updateMember(req.params.id, req.body, req.user.userId, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.deleteMember = async (req, res, next) => {
  try {
    const result = await membersService.deleteMember(
      req.params.id,
      req.user.userId,
      req.body.reason,
      req.user,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.unassignMemberFromScope = async (req, res, next) => {
  try {
    const result = await membersService.unassignMemberFromScope(
      req.params.id,
      req.user.userId,
      req.user,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.searchAssignableForScope = async (req, res, next) => {
  try {
    const result = await membersService.searchAssignableForScope(req.query, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.assignMemberToScope = async (req, res, next) => {
  try {
    const { member_id } = req.body;
    if (!member_id) {
      return res.status(400).json({ success: false, message: "member_id is required" });
    }
    const result = await membersService.assignMemberToScope(
      member_id,
      req.user.userId,
      req.user,
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.bulkCreateMembers = async (req, res, next) => {
  try {
    if (!req.file) throw AppError.badRequest("VALIDATION", "No CSV file uploaded");
    const result = await membersService.bulkCreateMembers(req.file.buffer, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

exports.linkMemberAccount = async (req, res, next) => {
  try {
    const result = await membersService.linkMemberAccount(req.params.id, req.body, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) { next(err); }
};

// ── Dropdown lists for the member form ───────────────────────
// Scoped leaders only see the group they lead; everyone else sees all.

const assignedOnlyWhere = (req, roleName, fieldName) => {
  if (req.user?.roleName === "Leader") {
    const requiredType = roleName === "Cell Group Leader" ? "cell_group" : "group";
    const selectedScope = getScope(req.user);
    if (
      selectedScope.type !== "all"
      && selectedScope.type !== requiredType
    ) {
      return { id: null };
    }
    const ids = getUnifiedAssignments(req.user)
      .filter((assignment) => assignment.type === requiredType)
      .map((assignment) => assignment.id);
    return ids.length ? { id: { [Op.in]: ids } } : { id: null };
  }
  if (req.user?.roleName !== roleName) return {};
  const id = req.user?.[fieldName];
  return id ? { id } : { id: null };
};

exports.getCellGroupDropdowns = async (req, res, next) => {
  try {
    const { CellGroup } = require("../models");
    const data = await CellGroup.findAll({
      where: assignedOnlyWhere(req, "Cell Group Leader", "leadsCellGroupId"),
      order: [["name", "ASC"]],
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.getGroupDropdowns = async (req, res, next) => {
  try {
    const { MinistryGroup } = require("../models");
    const data = await MinistryGroup.findAll({
      where: assignedOnlyWhere(req, "Group Leader", "leadsGroupId"),
      order: [["name", "ASC"]],
    });
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
