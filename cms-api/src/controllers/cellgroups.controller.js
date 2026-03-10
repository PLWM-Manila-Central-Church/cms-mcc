"use strict";

const cellGroupsService = require("../services/cellgroups.service");

exports.getAllCellGroups = async (req, res, next) => {
  try {
    const data = await cellGroupsService.getAllCellGroups();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getCellGroupById = async (req, res, next) => {
  try {
    const data = await cellGroupsService.getCellGroupById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createCellGroup = async (req, res, next) => {
  try {
    const data = await cellGroupsService.createCellGroup(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateCellGroup = async (req, res, next) => {
  try {
    const data = await cellGroupsService.updateCellGroup(req.params.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteCellGroup = async (req, res, next) => {
  try {
    const data = await cellGroupsService.deleteCellGroup(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getCellGroupHistory = async (req, res, next) => {
  try {
    const data = await cellGroupsService.getCellGroupHistory(req.params.memberId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createCellGroupHistory = async (req, res, next) => {
  try {
    const data = await cellGroupsService.createCellGroupHistory(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
