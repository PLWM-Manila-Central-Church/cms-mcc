"use strict";

const rolesService = require("../services/roles.service");
const { Role } = require("../models");

// ── Minimal list — any authenticated user (used in user creation form) ──
exports.listRoles = async (req, res, next) => {
  try {
    const roles = await Role.findAll({
      attributes: ["id", "role_name"],
      order: [["role_name", "ASC"]],
    });
    res.json({ success: true, data: roles });
  } catch (err) {
    next(err);
  }
};

exports.getAllRoles = async (req, res, next) => {
  try {
    const result = await rolesService.getAllRoles();
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.getRoleById = async (req, res, next) => {
  try {
    const result = await rolesService.getRoleById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.createRole = async (req, res, next) => {
  try {
    const result = await rolesService.createRole(req.body, req.user.userId);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const result = await rolesService.updateRole(req.params.id, req.body, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.deleteRole = async (req, res, next) => {
  try {
    const result = await rolesService.deleteRole(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
