"use strict";

const RETENTION_DAYS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

// Secondary retained rows only. People, money, events and services are never
// auto-purged; they must be restored or purged deliberately by an administrator.
const AUTO_PURGE_SYSTEM_TYPES = Object.freeze([
  "notifications",
  "emergency_contacts",
  "ministry_assignments",
  "ministry_memberships",
  "attendance_batch_items",
]);

const PROTECTED_SYSTEM_TYPES = Object.freeze([
  "users", "members", "events", "services", "finance_records", "funds", "accounts",
  "expense_categories", "expenses", "finance_attachments", "cell_groups",
  "inventory_items", "ministry_roles", "archive_categories", "attendance_records",
]);

const computePurgeAfter = (archivedAt, days = RETENTION_DAYS) => {
  if (!archivedAt) return null;
  const date = new Date(archivedAt);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getTime() + days * DAY_MS);
};

const daysRemaining = (purgeAfter, now = new Date()) => {
  if (!purgeAfter) return null;
  const date = new Date(purgeAfter);
  if (Number.isNaN(date.getTime())) return null;
  const value = Math.ceil((date.getTime() - new Date(now).getTime()) / DAY_MS);
  return Object.is(value, -0) ? 0 : value;
};

const retentionState = ({ archived = true, purgeAfter = null, hold = false, now = new Date() } = {}) => {
  if (!archived) return "active";
  if (hold) return "held";
  const left = daysRemaining(purgeAfter, now);
  if (left === null) return "unscheduled";
  if (left <= 0) return "due";
  return "scheduled";
};

const decorateRetention = (record, now = new Date()) => {
  if (!record) return record;
  const hold = Boolean(Number(record.retention_hold));
  return {
    ...record,
    purge_after: record.purge_after || null,
    retention_hold: hold,
    days_remaining: daysRemaining(record.purge_after, now),
    retention: retentionState({
      archived: Boolean(Number(record.is_deleted)),
      purgeAfter: record.purge_after,
      hold,
      now,
    }),
  };
};

const systemRetentionState = (archivedAt, now = new Date()) => {
  const left = daysRemaining(computePurgeAfter(archivedAt), now);
  if (left === null) return { days_remaining: null, retention: "unscheduled" };
  return { days_remaining: left, retention: left <= 0 ? "due" : "scheduled" };
};

module.exports = {
  RETENTION_DAYS,
  AUTO_PURGE_SYSTEM_TYPES,
  PROTECTED_SYSTEM_TYPES,
  computePurgeAfter,
  daysRemaining,
  retentionState,
  decorateRetention,
  systemRetentionState,
};
