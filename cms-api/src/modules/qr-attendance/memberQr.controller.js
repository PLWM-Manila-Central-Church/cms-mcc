"use strict";

const AppError = require("../../helpers/AppError");
const memberQrService = require("./memberQr.service");

const selfMemberId = (req) => {
  if (!req.user?.memberId) {
    throw AppError.badRequest("MEMBER_PROFILE_REQUIRED", "No member profile is linked to this account");
  }
  return req.user.memberId;
};

const sendQrImage = async (res, memberId) => {
  const png = await memberQrService.createMemberQrPng(memberId);
  res.set({
    "Content-Type": "image/png",
    "Cache-Control": "private, no-store, max-age=0",
    "X-Content-Type-Options": "nosniff",
    "Content-Disposition": "attachment; filename=\"mcc-member-qr.png\"",
  });
  return res.status(200).send(png);
};

exports.getFeatureAvailability = async (_req, res, next) => {
  try {
    const { getQrAttendanceAvailability } = require("./featureSettings");
    const result = await getQrAttendanceAvailability();
    res.set("Cache-Control", "private, no-store, max-age=0");
    res.json({ success: true, data: result });
  } catch (error) { next(error); }
};

exports.getMyQr = async (req, res, next) => {
  try {
    const data = await memberQrService.readCredentialState(selfMemberId(req));
    res.set("Cache-Control", "private, no-store, max-age=0");
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getMyEventAttendanceHistory = async (req, res, next) => {
  try {
    const records = await memberQrService.getEventAttendanceHistory(selfMemberId(req));
    res.set("Cache-Control", "private, no-store, max-age=0");
    res.json({ success: true, data: { records } });
  } catch (error) { next(error); }
};

exports.issueMyQr = async (req, res, next) => {
  try {
    const result = await memberQrService.issueSelfQr(selfMemberId(req), req.user.userId);
    res.set("Cache-Control", "private, no-store, max-age=0");
    res.status(result.created ? 201 : 200).json({
      success: true,
      data: { available: true, version: result.credential.version, issued_at: result.credential.issued_at },
    });
  } catch (error) { next(error); }
};

exports.getMyQrImage = async (req, res, next) => {
  try {
    return await sendQrImage(res, selfMemberId(req));
  } catch (error) { next(error); }
};

exports.getOperationalQr = async (req, res, next) => {
  try {
    const data = await memberQrService.readCredentialState(req.params.memberId);
    res.set("Cache-Control", "private, no-store, max-age=0");
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.issueOperationalQr = async (req, res, next) => {
  try {
    const result = await memberQrService.issueOperationalQr(req.params.memberId, req.user.userId);
    res.set("Cache-Control", "private, no-store, max-age=0");
    res.status(result.created ? 201 : 200).json({
      success: true,
      data: { available: true, version: result.credential.version, issued_at: result.credential.issued_at },
    });
  } catch (error) { next(error); }
};

exports.reissueOperationalQr = async (req, res, next) => {
  try {
    const result = await memberQrService.reissueOperationalQr(
      req.params.memberId,
      req.user.userId,
      req.body.reason,
    );
    res.set("Cache-Control", "private, no-store, max-age=0");
    res.status(201).json({
      success: true,
      data: { available: true, version: result.credential.version, issued_at: result.credential.issued_at },
    });
  } catch (error) { next(error); }
};

exports.getOperationalQrImage = async (req, res, next) => {
  try {
    return await sendQrImage(res, req.params.memberId);
  } catch (error) { next(error); }
};
