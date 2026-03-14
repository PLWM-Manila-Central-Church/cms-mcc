"use strict";

const { SystemSetting } = require("../models");
const auditLog = require("../helpers/auditLog.helper");

// Static metadata for known settings keys
const SETTING_META = {
  // General
  church_name:              { label: "Church Name",               group: "General",         type: "text" },
  church_address:           { label: "Church Address",            group: "General",         type: "text" },
  church_email:             { label: "Church Email",              group: "General",         type: "email" },
  church_phone:             { label: "Church Phone",              group: "General",         type: "text" },
  church_website:           { label: "Church Website",            group: "General",         type: "text" },
  system_timezone:          { label: "System Timezone",           group: "General",         type: "select",  options: ["Asia/Manila","Asia/Singapore","Asia/Tokyo","Asia/Bangkok","UTC","America/New_York","America/Los_Angeles","Europe/London"] },
  default_timezone:         { label: "Default Timezone",         group: "General",         type: "select",  options: ["Asia/Manila","Asia/Singapore","Asia/Tokyo","Asia/Bangkok","UTC","America/New_York","America/Los_Angeles","Europe/London"] },
  system_version:           { label: "System Version",           group: "General",         type: "text" },
  maintenance_mode:         { label: "Maintenance Mode",         group: "General",         type: "boolean" },
  // Finance
  currency:                 { label: "Currency",                  group: "Finance",         type: "select",  options: ["PHP","USD","EUR","SGD","AUD","GBP","JPY"] },
  currency_symbol:          { label: "Currency Symbol",          group: "Finance",         type: "text" },
  fiscal_year_start:        { label: "Fiscal Year Start",        group: "Finance",         type: "select",  options: ["1","2","3","4","5","6","7","8","9","10","11","12"] },
  finance_fiscal_month:     { label: "Finance Fiscal Month",     group: "Finance",         type: "select",  options: ["1","2","3","4","5","6","7","8","9","10","11","12"] },
  default_payment_method:   { label: "Default Payment Method",   group: "Finance",         type: "select",  options: ["cash","gcash","bank_transfer"] },
  // Members
  allow_self_register:      { label: "Allow Self Registration",  group: "Members",         type: "boolean" },
  require_approval:         { label: "Require Approval",         group: "Members",         type: "boolean" },
  default_member_status:    { label: "Default Member Status",    group: "Members",         type: "select",  options: ["Active","Inactive","Visitor"] },
  barcode_auto_generate:    { label: "Barcode Auto Generate",    group: "Members",         type: "boolean" },
  invite_expiry_hours:      { label: "Invite Expiry Hours",      group: "Members",         type: "number" },
  // Services
  max_attendance_cap:       { label: "Max Attendance Cap",       group: "Services",        type: "number" },
  service_capacity:         { label: "Default Service Capacity", group: "Services",        type: "number" },
  max_parking_slots:        { label: "Max Parking Slots",        group: "Services",        type: "number" },
  default_service_status:   { label: "Default Service Status",   group: "Services",        type: "select",  options: ["draft","published"] },
  attendance_barcode_mode:  { label: "Attendance Barcode Mode",  group: "Services",        type: "select",  options: ["0","1"] },
  // Events
  default_event_visibility: { label: "Default Event Visibility", group: "Events",          type: "select",  options: ["public","private","members_only"] },
  // Notifications
  enable_notifications:     { label: "Enable Notifications",     group: "Notifications",   type: "boolean" },
  email_notifications:      { label: "Email Notifications",      group: "Notifications",   type: "boolean" },
  low_stock_alert:          { label: "Low Stock Alert Threshold",group: "Notifications",   type: "number" },
  // Security
  max_failed_logins:        { label: "Max Failed Logins",        group: "Security",        type: "number" },
  session_timeout_hours:    { label: "Session Timeout Hours",    group: "Security",        type: "number" },
  // Files
  max_file_size_mb:         { label: "Max File Size (MB)",       group: "Files & Storage", type: "number" },
  allowed_file_types:       { label: "Allowed File Types",       group: "Files & Storage", type: "text" },
};

// Transform array of DB rows → keyed object with metadata
const toKeyedObject = (rows) => {
  const result = {};
  for (const row of rows) {
    const meta = SETTING_META[row.key] || { label: row.key, group: "General", type: "text" };
    result[row.key] = {
      value: row.value,
      label: meta.label,
      group: meta.group,
      type:  meta.type,
      ...(meta.options ? { options: meta.options } : {}),
    };
  }
  return result;
};

// ── Get All Settings ─────────────────────────────────────────
exports.getAllSettings = async () => {
  const rows = await SystemSetting.findAll({ order: [["key", "ASC"]] });
  return toKeyedObject(rows);
};

// ── Get Setting By Key ───────────────────────────────────────
exports.getSettingByKey = async (key) => {
  const setting = await SystemSetting.findOne({ where: { key } });
  if (!setting) throw { status: 404, message: "Setting not found" };
  return setting;
};

// ── Update Setting By Key ────────────────────────────────────
exports.updateSetting = async (key, value, updatedBy) => {
  const setting = await SystemSetting.findOne({ where: { key } });
  if (!setting) throw { status: 404, message: "Setting not found" };

  await setting.update({ value, updated_by: updatedBy });
  auditLog.log({ userId: updatedBy, action: "UPDATE_SETTING", targetTable: "system_settings", targetId: key });
  return setting;
};

// ── Bulk Update Settings (array format) ──────────────────────
exports.bulkUpdateSettings = async (settings, updatedBy) => {
  for (const { key, value } of settings) {
    const setting = await SystemSetting.findOne({ where: { key } });
    if (!setting) throw { status: 404, message: `Setting '${key}' not found` };
    await setting.update({ value, updated_by: updatedBy });
  }
  auditLog.log({ userId: updatedBy, action: "UPDATE_SETTINGS", targetTable: "system_settings" });
  const allRows = await SystemSetting.findAll({ order: [["key", "ASC"]] });
  return toKeyedObject(allRows);
};

// ── Bulk Update Settings from plain object { key: value, ... }
exports.bulkUpdateFromObject = async (obj, updatedBy) => {
  for (const [key, value] of Object.entries(obj)) {
    const setting = await SystemSetting.findOne({ where: { key } });
    if (!setting) continue;
    await setting.update({ value: String(value), updated_by: updatedBy });
  }
  auditLog.log({ userId: updatedBy, action: "UPDATE_SETTINGS", targetTable: "system_settings" });
  const allRows = await SystemSetting.findAll({ order: [["key", "ASC"]] });
  return toKeyedObject(allRows);
};

// ── Create Setting ───────────────────────────────────────────
exports.createSetting = async (data, updatedBy) => {
  const { key, value } = data;

  const existing = await SystemSetting.findOne({ where: { key } });
  if (existing) throw { status: 409, message: "Setting key already exists" };

  return await SystemSetting.create({
    key,
    value: value || null,
    updated_by: updatedBy,
  });
};

// ── Delete Setting ───────────────────────────────────────────
exports.deleteSetting = async (key) => {
  const setting = await SystemSetting.findOne({ where: { key } });
  if (!setting) throw { status: 404, message: "Setting not found" };

  await setting.destroy();
  return { message: "Setting deleted successfully." };
};
