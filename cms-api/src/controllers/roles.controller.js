"use strict";

const rolesService = require("../services/roles.service");

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
    const result = await rolesService.createRole(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateRole = async (req, res, next) => {
  try {
    const result = await rolesService.updateRole(req.params.id, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.deleteRole = async (req, res, next) => {
  try {
    const result = await rolesService.deleteRole(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
