"use strict";

const serviceExtrasService = require("../services/service-extras.service");

// ── Attendance Summary ───────────────────────────────────────
exports.getSummaryByService = async (req, res, next) => {
  try {
    const data = await serviceExtrasService.getSummaryByService(req.params.serviceId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.upsertSummary = async (req, res, next) => {
  try {
    const data = await serviceExtrasService.upsertSummary(req.params.serviceId, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Service Responses ────────────────────────────────────────
exports.getResponsesByService = async (req, res, next) => {
  try {
    const data = await serviceExtrasService.getResponsesByService(req.params.serviceId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createOrUpdateResponse = async (req, res, next) => {
  try {
    const { member_id, ...responseData } = req.body;
    const data = await serviceExtrasService.createOrUpdateResponse(
      req.params.serviceId,
      member_id,
      responseData,
      req.user.userId,
    );
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteResponse = async (req, res, next) => {
  try {
    const data = await serviceExtrasService.deleteResponse(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Substitute Requests ──────────────────────────────────────
exports.getAllSubstituteRequests = async (req, res, next) => {
  try {
    const data = await serviceExtrasService.getAllSubstituteRequests();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getSubstituteRequestById = async (req, res, next) => {
  try {
    const data = await serviceExtrasService.getSubstituteRequestById(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createSubstituteRequest = async (req, res, next) => {
  try {
    const data = await serviceExtrasService.createSubstituteRequest(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.resolveSubstituteRequest = async (req, res, next) => {
  try {
    const { status } = req.body;
    const data = await serviceExtrasService.resolveSubstituteRequest(req.params.id, status, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteSubstituteRequest = async (req, res, next) => {
  try {
    const data = await serviceExtrasService.deleteSubstituteRequest(req.params.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// ── Attendance by Service ────────────────────────────────────
const attendanceService = require("../services/attendance.service");

exports.getAttendanceByService = async (req, res, next) => {
  try {
    const { Attendance, Member } = require("../models");
    const records = await Attendance.findAll({
      where: { service_id: req.params.id },
      include: [{ model: Member, attributes: ["id", "first_name", "last_name", "barcode"], required: false }],
      order: [["checked_in_at", "DESC"]],
    });
    res.json({ success: true, data: records });
  } catch (err) { next(err); }
};

exports.createAttendanceForService = async (req, res, next) => {
  try {
    const data = await attendanceService.createAttendance(
      { ...req.body, service_id: req.params.id },
      req.user.userId,
    );
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
};

exports.deleteAttendanceForService = async (req, res, next) => {
  try {
    const { Attendance } = require("../models");
    const record = await Attendance.findOne({
      where: { service_id: req.params.id, member_id: req.params.memberId },
    });
    if (!record) throw { status: 404, message: "Attendance record not found" };
    await record.destroy();
    res.json({ success: true, message: "Attendance removed." });
  } catch (err) { next(err); }
};

// ── Service Responses alias (:id/responses) ─────────────────
const serviceExtrasService = require("../services/service-extras.service");

exports.getResponsesByServiceAlias = async (req, res, next) => {
  try {
    const data = await serviceExtrasService.getResponsesByService(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
};

exports.createOrUpdateResponseAlias = async (req, res, next) => {
  try {
    const { member_id, ...responseData } = req.body;
    const data = await serviceExtrasService.createOrUpdateResponse(
      req.params.id, member_id, responseData, req.user.userId,
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
