"use strict";

const AppError = require("../../helpers/AppError");
const { Event, Member } = require("../../models");
const { EventAttendance, MemberQrCredential, QrAttendanceSession, sequelize } = require("./models");
const { createPublicId, formatQrPayload } = require("./qrPayload");
const { writeQrAudit } = require("./audit");

const getCurrentMember = async (memberId, transaction, lock = false) => {
  const member = await Member.findByPk(memberId, {
    attributes: ["id", "first_name", "last_name", "status", "profile_photo_url"],
    ...(transaction && { transaction }),
    ...(transaction && lock && { lock: transaction.LOCK.UPDATE }),
  });
  if (!member) throw AppError.notFound("MEMBER_NOT_AVAILABLE", "Member QR is unavailable");
  return member;
};

const readActiveCredential = async (memberId, transaction, lock = false) => {
  const rows = await MemberQrCredential.findAll({
    where: { member_id: memberId, status: "active" },
    order: [["version", "DESC"]],
    limit: 2,
    ...(transaction && { transaction }),
    ...(transaction && lock && { lock: transaction.LOCK.UPDATE }),
  });
  if (rows.length > 1) {
    throw AppError.conflict("MEMBER_QR_INTEGRITY", "More than one active member QR is configured");
  }
  return rows[0] || null;
};

const readCredentialState = async (memberId) => {
  await getCurrentMember(memberId);
  const credential = await readActiveCredential(memberId);
  return {
    available: Boolean(credential),
    version: credential?.version || null,
    issued_at: credential?.issued_at || null,
    payload: credential ? formatQrPayload("member", credential.public_id) : null,
  };
};

const getCurrentOrIssue = async (memberId, issuedBy, { reissueReason } = {}) =>
  sequelize.transaction(async (transaction) => {
    await getCurrentMember(memberId, transaction, true);
    const active = await readActiveCredential(memberId, transaction, true);
    if (active && !reissueReason) {
      return {
        credential: active,
        created: false,
        payload: formatQrPayload("member", active.public_id),
      };
    }
    if (active && (!reissueReason || String(reissueReason).trim().length < 5)) {
      throw AppError.badRequest("QR_REISSUE_REASON_REQUIRED", "Enter a reason of at least 5 characters to reissue this QR");
    }

    const prior = await MemberQrCredential.findOne({
      where: { member_id: memberId },
      attributes: ["version"],
      order: [["version", "DESC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const version = Number(prior?.version || 0) + 1;
    const now = new Date();

    if (active) {
      await active.update({
        status: "revoked",
        revoked_by: issuedBy || null,
        revoked_at: now,
        revoke_reason: String(reissueReason).trim().slice(0, 500),
      }, { transaction });
    }

    const credential = await MemberQrCredential.create({
      member_id: memberId,
      public_id: createPublicId(),
      version,
      status: "active",
      issued_by: issuedBy || null,
      issued_at: now,
    }, { transaction });
    await writeQrAudit({
      actorId: issuedBy,
      action: active ? "MEMBER_QR_REISSUED" : "MEMBER_QR_ISSUED",
      table: "member_qr_credentials",
      recordId: credential.id,
      oldValues: active ? { version: active.version, status: "active" } : null,
      newValues: {
        member_id: memberId,
        version,
        status: "active",
        ...(reissueReason && { reason: String(reissueReason).trim().slice(0, 500) }),
      },
      transaction,
    });
    return {
      credential,
      created: true,
      payload: formatQrPayload("member", credential.public_id),
    };
  });

const issueSelfQr = async (memberId, userId) => {
  if (!memberId) throw AppError.badRequest("MEMBER_PROFILE_REQUIRED", "No member profile is linked to this account");
  return getCurrentOrIssue(memberId, userId);
};

const issueOperationalQr = async (memberId, userId) =>
  getCurrentOrIssue(memberId, userId);

const reissueOperationalQr = async (memberId, userId, reason) => {
  if (!String(reason || "").trim()) {
    throw AppError.badRequest("QR_REISSUE_REASON_REQUIRED", "A reason is required to reissue a member QR");
  }
  return getCurrentOrIssue(memberId, userId, { reissueReason: reason });
};

const getPayloadForMemberQr = async (memberId) => {
  await getCurrentMember(memberId);
  const credential = await readActiveCredential(memberId);
  if (!credential) throw AppError.conflict("MEMBER_QR_NOT_ISSUED", "Create a member QR before downloading it");
  return formatQrPayload("member", credential.public_id);
};

const createMemberQrPng = async (memberId) => {
  const payload = await getPayloadForMemberQr(memberId);
  const QRCode = require("qrcode");
  return QRCode.toBuffer(payload, {
    type: "png",
    errorCorrectionLevel: "H",
    margin: 4,
    width: 512,
  });
};

const getEventAttendanceHistory = async (memberId) => {
  await getCurrentMember(memberId);
  const records = await EventAttendance.findAll({
    where: { member_id: memberId },
    include: [{
      model: QrAttendanceSession,
      as: "session",
      attributes: ["id", "title", "starts_at"],
      required: true,
      include: [{
        model: Event,
        as: "event",
        attributes: ["id", "title", "start_date", "start_time", "status"],
        required: true,
      }],
    }],
    order: [["checked_in_at", "DESC"], ["id", "DESC"]],
  });
  return records.map((record) => ({
    id: record.id,
    event_id: record.session?.event?.id,
    event_title: record.session?.event?.title || record.session?.title || "Event",
    session_title: record.session?.title,
    date: record.session?.event?.start_date || record.session?.starts_at || null,
    check_in_time: record.checked_in_at,
    check_in_method: record.check_in_method,
    status: record.voided_at ? "Voided" : "Present",
    voided_at: record.voided_at || null,
  }));
};

module.exports = {
  createMemberQrPng,
  getPayloadForMemberQr,
  getCurrentOrIssue,
  getCurrentMember,
  getEventAttendanceHistory,
  issueOperationalQr,
  issueSelfQr,
  readCredentialState,
  reissueOperationalQr,
};
