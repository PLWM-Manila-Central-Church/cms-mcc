"use strict";

const AppError = require("../../helpers/AppError");
const { isQrAttendanceEnabled } = require("./featureSettings");

const assertLeaderMayUseLegacyServiceWrite = async (serviceId, user = {}, {
  approvedBatch = false,
  qrSessionWrite = false,
  action = "create",
} = {}) => {
  if (approvedBatch || qrSessionWrite) return;
  if (!Number.isInteger(Number(serviceId))) return;
  if (!(await isQrAttendanceEnabled())) return;

  const { QrAttendanceSession } = require("./models");
  const session = await QrAttendanceSession.findOne({
    where: { service_id: Number(serviceId) },
    attributes: ["status", "leader_confirmation_mode"],
  });
  if (session?.leader_confirmation_mode === "batch_review") {
    if (action === "create") {
      throw AppError.conflict("QR_ATTENDANCE_WORKSPACE_REQUIRED", "Record service check-ins in the QR Attendance Workspace for this session");
    }
    if (["Cell Group Leader", "Group Leader"].includes(user.roleName)) {
      throw AppError.conflict(
        "BATCH_APPROVAL_REQUIRED",
        "Submit this service attendance as a leader batch for Registration Team review",
      );
    }
  }
};

module.exports = { assertLeaderMayUseLegacyServiceWrite };
