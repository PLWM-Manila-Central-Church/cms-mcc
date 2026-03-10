"use strict";

const membersService = require("../services/members.service");

exports.getAllMembers = async (req, res, next) => {
  try {
    const result = await membersService.getAllMembers(req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.getMemberById = async (req, res, next) => {
  try {
    const result = await membersService.getMemberById(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.createMember = async (req, res, next) => {
  try {
    const result = await membersService.createMember(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateMember = async (req, res, next) => {
  try {
    const result = await membersService.updateMember(req.params.id, req.body);
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
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
