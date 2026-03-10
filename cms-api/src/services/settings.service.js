"use strict";

const { SystemSetting } = require("../models");

// Static metadata for known settings keys
const SETTING_META = {
  church_name:          { label: "Church Name",             group: "General",       type: "text" },
  church_address:       { label: "Church Address",          group: "General",       type: "text" },
  church_email:         { label: "Church Email",            group: "General",       type: "email" },
  church_phone:         { label: "Church Phone",            group: "General",       type: "text" },
  church_website:       { label: "Church Website",          group: "General",       type: "text" },
  default_timezone:     { label: "Default Timezone",        group: "General",       type: "text" },
  currency:             { label: "Currency",                group: "Finance",       type: "text" },
  fiscal_year_start:    { label: "Fiscal Year Start",       group: "Finance",       type: "text" },
  allow_self_register:  { label: "Allow Self Registration", group: "Members",       type: "boolean" },
  require_approval:     { label: "Require Approval",        group: "Members",       type: "boolean" },
  max_attendance_cap:   { label: "Max Attendance Cap",      group: "Services",      type: "number" },
  enable_notifications: { label: "Enable Notifications",    group: "Notifications", type: "boolean" },
  email_notifications:  { label: "Email Notifications",     group: "Notifications", type: "boolean" },
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
  return setting;
};

// ── Bulk Update Settings (array format) ──────────────────────
exports.bulkUpdateSettings = async (settings, updatedBy) => {
  // settings = [{ key, value }, ...]
  for (const { key, value } of settings) {
    const setting = await SystemSetting.findOne({ where: { key } });
    if (!setting) throw { status: 404, message: `Setting '${key}' not found` };
    await setting.update({ value, updated_by: updatedBy });
  }
  const allRows = await SystemSetting.findAll({ order: [["key", "ASC"]] });
  return toKeyedObject(allRows);
};

// ── Bulk Update Settings from plain object { key: value, ... }
exports.bulkUpdateFromObject = async (obj, updatedBy) => {
  for (const [key, value] of Object.entries(obj)) {
    const setting = await SystemSetting.findOne({ where: { key } });
    if (!setting) continue; // silently skip unknown keys
    await setting.update({ value: String(value), updated_by: updatedBy });
  }
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
