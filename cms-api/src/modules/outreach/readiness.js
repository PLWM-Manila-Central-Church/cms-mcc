"use strict";

const sequelize = require("../../config/db");
const AppError = require("../../helpers/AppError");
const REQUIRED = {
  outreach_preferences: ["member_id", "sms_enabled", "activity_reminders", "attendance_followups", "consent_phone", "consent_at", "consent_source", "consent_note", "recorded_by", "opted_out_at"],
  outreach_session_policies: ["session_id", "reminders_enabled", "followups_enabled", "series_key", "reminders_enabled_at", "updated_by", "revision"],
  attendance_exceptions: ["session_id", "member_id", "status", "reason", "updated_by"],
  attendance_follow_ups: ["member_id", "series_key", "episode_key", "episode_start_session_id", "trigger_session_id", "absence_count", "status", "assigned_to", "assigned_by", "resolved_by", "resolved_at", "resolution_note", "cancel_reason", "revision"],
  outreach_deliveries: ["member_id", "user_id", "session_id", "follow_up_id", "channel", "kind", "reminder_days", "idempotency_key", "message", "recipient_phone", "status", "delivery_mode", "scheduled_at", "expires_at", "next_attempt_at", "lease_until", "claim_token", "attempt_count", "provider_message_id", "provider_status_checked_at", "last_error_code", "notification_id", "sent_at", "delivered_at"],
  outreach_delivery_attempts: ["delivery_id", "attempt_number", "mode", "status", "error_code", "provider_message_id", "started_at", "finished_at"],
};
let cache = null;
const readiness = async () => {
  if (cache && cache.until > Date.now()) return cache.ready;
  try {
    const qi = sequelize.getQueryInterface();
    const tables = new Set((await qi.showAllTables()).map((table) => typeof table === "string" ? table : Object.values(table)[0]));
    for (const [table, fields] of Object.entries(REQUIRED)) {
      if (!tables.has(table)) throw new Error("missing table");
      const columns = await qi.describeTable(table);
      if (["id", "created_at", "updated_at", ...fields].some((field) => !columns[field])) throw new Error("missing column");
    }
    cache = { until: Date.now() + 30000, ready: true };
    return true;
  } catch {
    cache = { until: Date.now() + 5000, ready: false };
    return false;
  }
};
const requireSchema = async (_req, _res, next) => {
  try {
    if (!await readiness()) throw new AppError("OUTREACH_SCHEMA_NOT_READY", 503, "Notification management needs its database migration. Other modules remain available.");
    next();
  } catch (error) { next(error); }
};
module.exports = { readiness, requireSchema, clearReadiness: () => { cache = null; } };
