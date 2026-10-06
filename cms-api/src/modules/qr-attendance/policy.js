"use strict";

const AppError = require("../../helpers/AppError");
const { EventRegistration } = require("../../models");
const { MemberQrCredential } = require("./models");
const { parseQrPayload } = require("./qrPayload");
const { assertMemberInActorScope } = require("./scope");
const { getSessionWithParent } = require("./sessions.service");

const assertSessionCaptureOpen = (session) => {
  const now = Date.now();
  if (session.status !== "open") {
    throw AppError.conflict("SESSION_NOT_OPEN", "Attendance is not open for this session");
  }
  if (now < new Date(session.check_in_opens_at).getTime()) {
    throw AppError.conflict("CHECK_IN_NOT_OPEN", "Check-in has not opened for this session");
  }
  if (now > new Date(session.check_in_closes_at).getTime()) {
    throw AppError.conflict("CHECK_IN_CLOSED", "The check-in window has closed");
  }
};

const assertParentAllowsCapture = (sessionInfo) => {
  const { target, target_type: targetType } = sessionInfo;
  const status = String(target.status || "").toLowerCase();
  if (targetType === "service" && status !== "published") {
    throw AppError.conflict("SERVICE_NOT_PUBLISHED", "This service is not open for check-in");
  }
  if (targetType === "event" && !["upcoming", "ongoing", "published"].includes(status)) {
    throw AppError.conflict("EVENT_NOT_OPEN", "This event is not open for check-in");
  }
};

const requireSessionCapture = async (sessionId, { transaction } = {}) => {
  const info = await getSessionWithParent(sessionId, transaction);
  assertSessionCaptureOpen(info);
  assertParentAllowsCapture(info);
  return info;
};

const resolveMemberQr = async (payload, user, { transaction } = {}) => {
  const parsed = parseQrPayload(payload);
  if (!parsed) throw AppError.badRequest("QR_INVALID", "This image does not contain a supported attendance QR");
  if (parsed.kind !== "member") throw AppError.badRequest("QR_KIND_MISMATCH", "Scan a member QR for individual check-in");

  const credential = await MemberQrCredential.findOne({
    where: { public_id: parsed.publicId, status: "active" },
    transaction,
  });
  if (!credential) throw AppError.notFound("QR_UNAVAILABLE", "This member QR is unavailable or has been reissued");

  const member = await assertMemberInActorScope(credential.member_id, user, transaction);
  return { member, credential };
};

const assertSessionRegistration = async (sessionInfo, memberId, transaction) => {
  if (!sessionInfo.registration_required) return;
  if (sessionInfo.target_type !== "event") {
    throw AppError.conflict("INVALID_SESSION_POLICY", "Only Event sessions can require registration");
  }
  const registration = await EventRegistration.findOne({
    where: { event_id: sessionInfo.target.id, member_id: memberId },
    ...(transaction && { transaction }),
  });
  if (!registration) {
    throw AppError.conflict("REGISTRATION_REQUIRED", "Register for this event before checking in");
  }
};

const assertLeaderBatchSession = (sessionInfo, user) => {
  const scope = require("../../helpers/scopedLeader.helper").getScope(user);
  if (scope && sessionInfo.leader_confirmation_mode !== "batch_review") {
    throw AppError.conflict("SESSION_NOT_USING_BATCH_REVIEW", "This session is not configured for leader batch review");
  }
  if (scope && !["cell_group", "group"].includes(scope.type)) {
    throw AppError.forbidden("Only Cell Group and Group Leaders can submit attendance batches");
  }
};

module.exports = {
  assertLeaderBatchSession,
  assertParentAllowsCapture,
  assertSessionCaptureOpen,
  assertSessionRegistration,
  requireSessionCapture,
  resolveMemberQr,
};
