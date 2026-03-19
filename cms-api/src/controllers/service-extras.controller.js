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

// Returns only the requests submitted by the calling user
exports.getMySubstituteRequests = async (req, res, next) => {
  try {
    const data = await serviceExtrasService.getMySubstituteRequests(req.user.userId);
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
    const { Attendance, Member, Service, ServiceAttendanceSummary, ServiceResponse } = require("../models");

    const service = await Service.findByPk(req.params.id);
    if (!service) return res.status(404).json({ success: false, message: "Service not found" });

    const records = await Attendance.findAll({
      where: { service_id: req.params.id },
      include: [{ model: Member, attributes: ["id", "first_name", "last_name", "barcode"], required: false }],
      order: [["checked_in_at", "DESC"]],
    });

    const summary = await ServiceAttendanceSummary.findOne({
      where: { service_id: req.params.id },
    });

    // ── Merge pre-reg responses as virtual attendance rows ──────
    // Include members who said they're attending but haven't checked in yet
    const checkedInIds = new Set(records.map(r => r.member_id));
    const preRegs = await ServiceResponse.findAll({
      where: { service_id: req.params.id, attendance_status: "ATTENDING" },
      include: [{ model: Member, attributes: ["id", "first_name", "last_name", "barcode"], required: false }],
    });

    const preRegRows = preRegs
      .filter(pr => !checkedInIds.has(pr.member_id))
      .map(pr => ({
        id:              `prereg-${pr.id}`,
        service_id:      pr.service_id,
        member_id:       pr.member_id,
        check_in_method: "pre-reg",
        checked_in_at:   pr.created_at,
        is_pre_reg:      true,
        Member:          pr.Member,
      }));

    res.json({ success: true, data: { service, records: [...records, ...preRegRows], summary: summary || null } });
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
    // Find the record first to get its id
    const record = await Attendance.findOne({
      where: { service_id: req.params.id, member_id: req.params.memberId },
    });
    if (!record) throw { status: 404, message: "Attendance record not found" };
    // FIX: route through the service layer so syncSummary fires and the
    // attendance bar decrements correctly when Undo is clicked.
    await attendanceService.deleteAttendance(record.id);
    res.json({ success: true, message: "Attendance removed." });
  } catch (err) { next(err); }
};

// ── Service Responses alias (:id/responses) ─────────────────
exports.getResponsesByServiceAlias = async (req, res, next) => {
  try {
    const responses = await serviceExtrasService.getResponsesByService(req.params.id);
    res.json({ success: true, data: { responses } });
  } catch (err) { next(err); }
};

exports.createOrUpdateResponseAlias = async (req, res, next) => {
  try {
    const member_id = req.body.member_id || req.user.memberId;
    if (!member_id) return res.status(400).json({ success: false, message: "No member profile linked to this account" });
    const { member_id: _m, ...responseData } = req.body;
    const data = await serviceExtrasService.createOrUpdateResponse(
      req.params.id, member_id, responseData, req.user.userId,
    );
    res.json({ success: true, data });
  } catch (err) { next(err); }
};
