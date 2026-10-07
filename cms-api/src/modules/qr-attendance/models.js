"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../../config/db");
const {
  User,
  Member,
  Service,
  Event,
  CellGroup,
  Group,
} = require("../../models");

const timestamps = { timestamps: true, underscored: true };

const QrAttendanceSession = sequelize.define("QrAttendanceSession", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  session_key: { type: DataTypes.STRING(80), allowNull: false, defaultValue: "primary" },
  title: { type: DataTypes.STRING(150), allowNull: false },
  starts_at: { type: DataTypes.DATE, allowNull: false },
  ends_at: { type: DataTypes.DATE, allowNull: false },
  check_in_opens_at: { type: DataTypes.DATE, allowNull: false },
  check_in_closes_at: { type: DataTypes.DATE, allowNull: false },
  approval_deadline: { type: DataTypes.DATE, allowNull: false },
  time_zone: { type: DataTypes.STRING(64), allowNull: false, defaultValue: "Asia/Manila" },
  status: {
    type: DataTypes.ENUM("draft", "open", "closed", "cancelled"),
    allowNull: false,
    defaultValue: "draft",
  },
  expected_basis: {
    type: DataTypes.ENUM("none", "registrations", "explicit_roster"),
    allowNull: false,
    defaultValue: "none",
  },
  registration_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  leader_confirmation_mode: {
    type: DataTypes.ENUM("direct", "batch_review"),
    allowNull: false,
    defaultValue: "batch_review",
  },
  expected_roster_frozen_at: { type: DataTypes.DATE, allowNull: true },
  created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, { ...timestamps, tableName: "attendance_sessions" });

const MemberQrCredential = sequelize.define("MemberQrCredential", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  public_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  status: {
    type: DataTypes.ENUM("active", "revoked"),
    allowNull: false,
    defaultValue: "active",
  },
  issued_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  issued_at: { type: DataTypes.DATE, allowNull: false },
  revoked_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  revoked_at: { type: DataTypes.DATE, allowNull: true },
  revoke_reason: { type: DataTypes.STRING(500), allowNull: true },
}, { ...timestamps, tableName: "member_qr_credentials" });

const AttendanceExpectedMember = sequelize.define("AttendanceExpectedMember", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  session_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  source: {
    type: DataTypes.ENUM("event_registration", "service_rsvp", "staff_added"),
    allowNull: false,
  },
  cell_group_id_at_freeze: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  group_id_at_freeze: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false },
}, { timestamps: false, underscored: true, tableName: "attendance_expected_members" });

const AttendanceBatch = sequelize.define("AttendanceBatch", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  session_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  public_id: { type: DataTypes.UUID, allowNull: false, unique: true },
  submitted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  cell_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  state: {
    type: DataTypes.ENUM("draft", "submitted", "approved", "rejected", "withdrawn"),
    allowNull: false,
    defaultValue: "draft",
  },
  revision: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
  content_digest: { type: DataTypes.STRING(64), allowNull: true },
  idempotency_key: { type: DataTypes.UUID, allowNull: false },
  supersedes_batch_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  submitted_at: { type: DataTypes.DATE, allowNull: true },
  approval_deadline: { type: DataTypes.DATE, allowNull: false },
  reviewed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  reviewed_at: { type: DataTypes.DATE, allowNull: true },
  decision_reason: { type: DataTypes.STRING(500), allowNull: true },
}, { ...timestamps, tableName: "attendance_batches" });

// QR fields live on the existing attendances table, but use a separate model so
// legacy API queries do not select optional columns before the additive
// migration is ready. QR routes are gated by getQrSchemaReadiness().
const QrServiceAttendance = sequelize.define("QrServiceAttendance", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  check_in_method: { type: DataTypes.ENUM("barcode", "manual", "pre-reg"), allowNull: false },
  checked_in_at: { type: DataTypes.DATE, allowNull: false },
  recorded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  entry_source: { type: DataTypes.ENUM("legacy", "direct", "leader_batch"), allowNull: false, defaultValue: "legacy" },
  source_batch_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  cell_group_id_at_check_in: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  group_id_at_check_in: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  confirmed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  confirmed_at: { type: DataTypes.DATE, allowNull: true },
  qr_revision: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  voided_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  voided_at: { type: DataTypes.DATE, allowNull: true },
  void_reason: { type: DataTypes.STRING(500), allowNull: true },
}, { timestamps: false, underscored: true, tableName: "attendances" });

const EventAttendance = sequelize.define("EventAttendance", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  session_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  check_in_method: { type: DataTypes.ENUM("qr", "manual"), allowNull: false },
  entry_source: { type: DataTypes.ENUM("direct", "leader_batch"), allowNull: false },
  checked_in_at: { type: DataTypes.DATE, allowNull: false },
  recorded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  confirmed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  confirmed_at: { type: DataTypes.DATE, allowNull: false },
  source_batch_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  cell_group_id_at_check_in: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  group_id_at_check_in: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  voided_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  voided_at: { type: DataTypes.DATE, allowNull: true },
  void_reason: { type: DataTypes.STRING(500), allowNull: true },
}, { ...timestamps, tableName: "event_attendances" });

const AttendanceBatchItem = sequelize.define("AttendanceBatchItem", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  batch_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  captured_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  capture_method: { type: DataTypes.ENUM("qr", "manual"), allowNull: false },
  captured_at: { type: DataTypes.DATE, allowNull: false },
  cell_group_id_at_capture: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  group_id_at_capture: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  outcome: {
    type: DataTypes.ENUM("pending", "confirmed", "already_confirmed"),
    allowNull: false,
    defaultValue: "pending",
  },
  service_attendance_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  event_attendance_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, { ...timestamps, tableName: "attendance_batch_items" });

QrAttendanceSession.belongsTo(Service, { foreignKey: "service_id", as: "service" });
QrAttendanceSession.belongsTo(Event, { foreignKey: "event_id", as: "event" });
QrAttendanceSession.belongsTo(User, { foreignKey: "created_by", as: "creator" });

MemberQrCredential.belongsTo(Member, { foreignKey: "member_id", as: "member" });
MemberQrCredential.belongsTo(User, { foreignKey: "issued_by", as: "issuer" });
MemberQrCredential.belongsTo(User, { foreignKey: "revoked_by", as: "revoker" });

AttendanceExpectedMember.belongsTo(QrAttendanceSession, { foreignKey: "session_id", as: "session" });
AttendanceExpectedMember.belongsTo(Member, { foreignKey: "member_id", as: "member" });
AttendanceExpectedMember.belongsTo(CellGroup, { foreignKey: "cell_group_id_at_freeze", as: "cellGroupAtFreeze" });
AttendanceExpectedMember.belongsTo(Group, { foreignKey: "group_id_at_freeze", as: "groupAtFreeze" });

AttendanceBatch.belongsTo(QrAttendanceSession, { foreignKey: "session_id", as: "session" });
AttendanceBatch.belongsTo(User, { foreignKey: "submitted_by", as: "submitter" });
AttendanceBatch.belongsTo(User, { foreignKey: "reviewed_by", as: "reviewer" });
AttendanceBatch.belongsTo(CellGroup, { foreignKey: "cell_group_id", as: "cellGroup" });
AttendanceBatch.belongsTo(Group, { foreignKey: "group_id", as: "group" });
AttendanceBatch.belongsTo(AttendanceBatch, { foreignKey: "supersedes_batch_id", as: "supersedesBatch" });

AttendanceBatchItem.belongsTo(AttendanceBatch, { foreignKey: "batch_id", as: "batch" });
AttendanceBatchItem.belongsTo(Member, { foreignKey: "member_id", as: "member" });
AttendanceBatchItem.belongsTo(User, { foreignKey: "captured_by", as: "capturedBy" });
AttendanceBatchItem.belongsTo(CellGroup, { foreignKey: "cell_group_id_at_capture", as: "cellGroupAtCapture" });
AttendanceBatchItem.belongsTo(Group, { foreignKey: "group_id_at_capture", as: "groupAtCapture" });
AttendanceBatchItem.belongsTo(QrServiceAttendance, { foreignKey: "service_attendance_id", as: "serviceAttendance" });
AttendanceBatchItem.belongsTo(EventAttendance, { foreignKey: "event_attendance_id", as: "eventAttendance" });

EventAttendance.belongsTo(QrAttendanceSession, { foreignKey: "session_id", as: "session" });
EventAttendance.belongsTo(Member, { foreignKey: "member_id", as: "member" });
EventAttendance.belongsTo(User, { foreignKey: "recorded_by", as: "recorder" });
EventAttendance.belongsTo(User, { foreignKey: "confirmed_by", as: "confirmer" });
EventAttendance.belongsTo(AttendanceBatch, { foreignKey: "source_batch_id", as: "sourceBatch" });
EventAttendance.belongsTo(CellGroup, { foreignKey: "cell_group_id_at_check_in", as: "cellGroupAtCheckIn" });
EventAttendance.belongsTo(Group, { foreignKey: "group_id_at_check_in", as: "groupAtCheckIn" });
EventAttendance.belongsTo(User, { foreignKey: "voided_by", as: "voidedBy" });

QrServiceAttendance.belongsTo(Service, { foreignKey: "service_id" });
QrServiceAttendance.belongsTo(Member, { foreignKey: "member_id" });
QrServiceAttendance.belongsTo(User, { foreignKey: "recorded_by", as: "recorder" });
QrServiceAttendance.belongsTo(User, { foreignKey: "confirmed_by", as: "confirmer" });
QrServiceAttendance.belongsTo(AttendanceBatch, { foreignKey: "source_batch_id", as: "sourceBatch" });
QrServiceAttendance.belongsTo(CellGroup, { foreignKey: "cell_group_id_at_check_in", as: "cellGroupAtCheckIn" });
QrServiceAttendance.belongsTo(Group, { foreignKey: "group_id_at_check_in", as: "groupAtCheckIn" });
QrServiceAttendance.belongsTo(User, { foreignKey: "voided_by", as: "voidedBy" });
QrServiceAttendance.hasMany(AttendanceBatchItem, { foreignKey: "service_attendance_id", as: "qrBatchItems" });
EventAttendance.hasMany(AttendanceBatchItem, { foreignKey: "event_attendance_id", as: "qrBatchItems" });
AttendanceBatch.hasMany(AttendanceBatchItem, { foreignKey: "batch_id", as: "items" });
QrAttendanceSession.hasMany(AttendanceBatch, { foreignKey: "session_id", as: "batches" });
QrAttendanceSession.hasMany(EventAttendance, { foreignKey: "session_id", as: "eventAttendances" });

module.exports = {
  AttendanceBatch,
  AttendanceBatchItem,
  AttendanceExpectedMember,
  EventAttendance,
  MemberQrCredential,
  QrServiceAttendance,
  QrAttendanceSession,
  sequelize,
};
