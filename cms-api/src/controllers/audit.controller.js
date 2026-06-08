"use strict";

const auditService = require("../services/audit.service");
const { revertLog } = require("../helpers/auditRevert.helper");

exports.getAllLogs = async (req, res, next) => {
  try {
    const data = await auditService.getAllLogs(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getLogById = async (req, res, next) => {
  try {
    const data = await auditService.getLogById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getLogsByUser = async (req, res, next) => {
  try {
    const data = await auditService.getLogsByUser(req.params.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getLogsByTable = async (req, res, next) => {
  try {
    const data = await auditService.getLogsByTable(req.params.table);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.revertLog = async (req, res, next) => {
  try {
    const result = await revertLog(req.params.id, req.user.userId);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
