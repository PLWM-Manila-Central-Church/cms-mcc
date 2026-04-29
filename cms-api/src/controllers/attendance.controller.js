"use strict";

const attendanceService = require("../services/attendance.service");

exports.getAllAttendance = async (req, res, next) => {
  try {
    const result = await attendanceService.getAllAttendance(req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.getAttendanceById = async (req, res, next) => {
  try {
    const result = await attendanceService.getAttendanceById(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.createAttendance = async (req, res, next) => {
  try {
    const result = await attendanceService.createAttendance(
      req.body,
      req.user.userId,
      req.user,
    );
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.updateAttendance = async (req, res, next) => {
  try {
    const result = await attendanceService.updateAttendance(
      req.params.id,
      req.body,
      req.user,
    );
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};

exports.deleteAttendance = async (req, res, next) => {
  try {
    const result = await attendanceService.deleteAttendance(req.params.id, req.user);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
};
