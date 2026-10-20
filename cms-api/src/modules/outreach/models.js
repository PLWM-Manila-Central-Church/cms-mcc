"use strict";

const { DataTypes: D } = require("sequelize");
const sequelize = require("../../config/db");
const { Member, User, Notification } = require("../../models");
const { QrAttendanceSession } = require("../qr-attendance/models");
const id = () => ({ type: D.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true });
const ref = (nullable = false) => ({ type: D.INTEGER.UNSIGNED, allowNull: nullable });
const bool = (value) => ({ type: D.BOOLEAN, allowNull: false, defaultValue: value });
const define = (name, tableName, attributes) => sequelize.define(name, {
  id: id(), ...attributes,
}, { tableName, timestamps: true, underscored: true });

const OutreachPreference = define("OutreachPreference", "outreach_preferences", {
  member_id: { ...ref(), unique: true },
  sms_enabled: bool(false),
  activity_reminders: bool(true),
  attendance_followups: bool(true),
  consent_phone: { type: D.STRING(20), allowNull: true },
  consent_at: { type: D.DATE, allowNull: true },
  consent_source: { type: D.STRING(30), allowNull: true },
  consent_note: { type: D.STRING(500), allowNull: true },
  recorded_by: ref(true),
  opted_out_at: { type: D.DATE, allowNull: true },
});
const OutreachSessionPolicy = define("OutreachSessionPolicy", "outreach_session_policies", {
  session_id: { ...ref(), unique: true },
  reminders_enabled: bool(false),
  followups_enabled: bool(false),
  series_key: { type: D.STRING(80), allowNull: false, defaultValue: "church_gatherings" },
  reminders_enabled_at: { type: D.DATE, allowNull: true },
  updated_by: ref(true),
  revision: { type: D.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
});
const AttendanceException = define("AttendanceException", "attendance_exceptions", {
  session_id: ref(),
  member_id: ref(),
  status: { type: D.ENUM("excused", "pending", "cleared"), allowNull: false },
  reason: { type: D.STRING(500), allowNull: false },
  updated_by: ref(true),
});
const AttendanceFollowUp = define("AttendanceFollowUp", "attendance_follow_ups", {
  member_id: ref(),
  series_key: { type: D.STRING(80), allowNull: false },
  episode_key: { type: D.STRING(64), allowNull: false, unique: true },
  episode_start_session_id: ref(),
  trigger_session_id: ref(),
  absence_count: { type: D.INTEGER.UNSIGNED, allowNull: false },
  status: { type: D.ENUM("open", "assigned", "resolved", "cancelled"), allowNull: false, defaultValue: "open" },
  assigned_to: ref(true),
  assigned_by: ref(true),
  resolved_by: ref(true),
  resolved_at: { type: D.DATE, allowNull: true },
  resolution_note: { type: D.STRING(1000), allowNull: true },
  cancel_reason: { type: D.STRING(200), allowNull: true },
  revision: { type: D.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
});
const OutreachDelivery = define("OutreachDelivery", "outreach_deliveries", {
  member_id: ref(),
  user_id: ref(true),
  session_id: ref(true),
  follow_up_id: ref(true),
  channel: { type: D.ENUM("in_app", "sms"), allowNull: false },
  kind: { type: D.ENUM("activity_reminder", "absence_followup"), allowNull: false },
  reminder_days: { type: D.INTEGER.UNSIGNED, allowNull: true },
  idempotency_key: { type: D.STRING(64), allowNull: false, unique: true },
  message: { type: D.STRING(1000), allowNull: false },
  recipient_phone: { type: D.STRING(20), allowNull: true },
  status: { type: D.ENUM("queued", "processing", "simulated", "sent", "delivered", "failed", "unknown", "cancelled", "skipped"), allowNull: false, defaultValue: "queued" },
  delivery_mode: { type: D.STRING(20), allowNull: true },
  scheduled_at: { type: D.DATE, allowNull: false },
  expires_at: { type: D.DATE, allowNull: false },
  next_attempt_at: { type: D.DATE, allowNull: false },
  lease_until: { type: D.DATE, allowNull: true },
  claim_token: { type: D.STRING(36), allowNull: true },
  attempt_count: { type: D.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
  provider_message_id: { type: D.STRING(150), allowNull: true },
  provider_status_checked_at: { type: D.DATE, allowNull: true },
  last_error_code: { type: D.STRING(80), allowNull: true },
  notification_id: ref(true),
  sent_at: { type: D.DATE, allowNull: true },
  delivered_at: { type: D.DATE, allowNull: true },
});
const OutreachDeliveryAttempt = define("OutreachDeliveryAttempt", "outreach_delivery_attempts", {
  delivery_id: ref(),
  attempt_number: { type: D.INTEGER.UNSIGNED, allowNull: false },
  mode: { type: D.STRING(20), allowNull: false },
  status: { type: D.STRING(30), allowNull: false },
  error_code: { type: D.STRING(80), allowNull: true },
  provider_message_id: { type: D.STRING(150), allowNull: true },
  started_at: { type: D.DATE, allowNull: false },
  finished_at: { type: D.DATE, allowNull: true },
});

for (const model of [OutreachPreference, AttendanceException, AttendanceFollowUp, OutreachDelivery]) {
  model.belongsTo(Member, { foreignKey: "member_id", as: "member" });
}
OutreachSessionPolicy.belongsTo(QrAttendanceSession, { foreignKey: "session_id", as: "session" });
AttendanceException.belongsTo(QrAttendanceSession, { foreignKey: "session_id", as: "session" });
AttendanceFollowUp.belongsTo(User, { foreignKey: "assigned_to", as: "assignee" });
AttendanceFollowUp.belongsTo(QrAttendanceSession, { foreignKey: "trigger_session_id", as: "triggerSession" });
OutreachDelivery.belongsTo(AttendanceFollowUp, { foreignKey: "follow_up_id", as: "followUp" });
OutreachDelivery.belongsTo(Notification, { foreignKey: "notification_id", as: "notification" });
OutreachDeliveryAttempt.belongsTo(OutreachDelivery, { foreignKey: "delivery_id", as: "delivery" });
module.exports = { OutreachPreference, OutreachSessionPolicy, AttendanceException, AttendanceFollowUp, OutreachDelivery, OutreachDeliveryAttempt };
