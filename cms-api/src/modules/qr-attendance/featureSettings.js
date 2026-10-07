"use strict";

const { SystemSetting } = require("../../models");
const AppError = require("../../helpers/AppError");
const sequelize = require("../../config/db");

const QR_ATTENDANCE_SETTING = "qr_attendance_enabled";
const REQUIRED_TABLES = [
  "attendance_sessions",
  "member_qr_credentials",
  "attendance_expected_members",
  "attendance_batches",
  "attendance_batch_items",
  "event_attendances",
];
const REQUIRED_COLUMNS = {
  attendance_sessions: ["service_id", "event_id", "session_key", "title", "starts_at", "ends_at", "check_in_opens_at", "check_in_closes_at", "approval_deadline", "time_zone", "status", "expected_basis", "registration_required", "leader_confirmation_mode", "expected_roster_frozen_at", "config_revision", "activity_revision", "capture_closed_at", "finalized_at", "finalized_by", "finalized_revision", "created_by", "created_at", "updated_at"],
  member_qr_credentials: ["member_id", "public_id", "version", "status", "issued_by", "issued_at", "revoked_by", "revoked_at", "revoke_reason", "created_at", "updated_at"],
  attendance_expected_members: ["session_id", "member_id", "source", "cell_group_id_at_freeze", "group_id_at_freeze", "created_at"],
  attendance_batches: ["session_id", "public_id", "submitted_by", "cell_group_id", "group_id", "state", "revision", "content_digest", "idempotency_key", "supersedes_batch_id", "submitted_at", "approval_deadline", "reviewed_by", "reviewed_at", "decision_reason", "created_at", "updated_at"],
  attendance_batch_items: ["batch_id", "member_id", "captured_by", "capture_method", "captured_at", "cell_group_id_at_capture", "group_id_at_capture", "outcome", "service_attendance_id", "event_attendance_id", "created_at", "updated_at"],
  event_attendances: ["session_id", "member_id", "check_in_method", "entry_source", "checked_in_at", "recorded_by", "confirmed_by", "confirmed_at", "source_batch_id", "cell_group_id_at_check_in", "group_id_at_check_in", "voided_by", "voided_at", "void_reason", "version", "created_at", "updated_at"],
  attendances: ["service_id", "member_id", "check_in_method", "checked_in_at", "recorded_by", "entry_source", "source_batch_id", "confirmed_by", "confirmed_at", "cell_group_id_at_check_in", "group_id_at_check_in", "qr_revision", "voided_by", "voided_at", "void_reason"],
};
let schemaReadinessCache = null;

const isQrAttendanceEnabled = async () => {
  const setting = await SystemSetting.findOne({
    where: { key: QR_ATTENDANCE_SETTING },
    attributes: ["value"],
  });
  return String(setting?.value || "").trim().toLowerCase() === "true";
};

const getQrSchemaReadiness = async () => {
  if (schemaReadinessCache && schemaReadinessCache.expiresAt > Date.now()) {
    return schemaReadinessCache.result;
  }
  try {
    const tables = await sequelize.getQueryInterface().showAllTables();
    const tableNames = new Set(tables.map((item) =>
      typeof item === "string" ? item.toLowerCase() : String(Object.values(item)[0]).toLowerCase(),
    ));
    const missingItems = REQUIRED_TABLES.filter((table) => !tableNames.has(table));
    for (const [table, requiredColumns] of Object.entries(REQUIRED_COLUMNS)) {
      if (!tableNames.has(table)) continue;
      const columns = await sequelize.getQueryInterface().describeTable(table);
      const missingColumns = requiredColumns.filter((column) => !columns[column]);
      if (missingColumns.length) missingItems.push(`${table} missing ${missingColumns.length} required QR columns`);
    }
    const result = { ready: missingItems.length === 0, missingCount: missingItems.length };
    schemaReadinessCache = { result, expiresAt: Date.now() + 30_000 };
    return result;
  } catch {
    const result = { ready: false, missingCount: REQUIRED_TABLES.length };
    schemaReadinessCache = { result, expiresAt: Date.now() + 5_000 };
    return result;
  }
};

const getQrAttendanceAvailability = async () => {
  if (!(await isQrAttendanceEnabled())) {
    return { enabled: false, schemaReady: false, reason: "disabled" };
  }
  const readiness = await getQrSchemaReadiness();
  return readiness.ready
    ? { enabled: true, schemaReady: true, reason: null }
    : { enabled: false, schemaReady: false, reason: "schema_not_ready" };
};

const requireQrAttendanceEnabled = async (_req, _res, next) => {
  try {
    const availability = await getQrAttendanceAvailability();
    if (!availability.enabled && availability.reason === "disabled") {
      return next(AppError.conflict("QR_ATTENDANCE_DISABLED", "QR attendance is disabled in Settings"));
    }
    if (!availability.enabled) {
      return next(AppError.conflict("QR_SCHEMA_NOT_READY", "QR attendance is not ready yet. Contact an administrator."));
    }
    return next();
  } catch (error) {
    return next(error);
  }
};

module.exports = {
  QR_ATTENDANCE_SETTING,
  getQrAttendanceAvailability,
  getQrSchemaReadiness,
  isQrAttendanceEnabled,
  requireQrAttendanceEnabled,
};
