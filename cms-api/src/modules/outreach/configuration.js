"use strict";
const { Op } = require("sequelize");
const sequelize = require("../../config/db");
const { SystemSetting, AuditLog } = require("../../models");
const AppError = require("../../helpers/AppError");
const { DEFAULTS } = require("./policy");
const PREFIX = "outreach_";
const getConfiguration = async () => {
  const rows = await SystemSetting.findAll({ where: { key: { [Op.in]: Object.keys(DEFAULTS).map((name) => PREFIX + name) } }, attributes: ["key", "value"] });
  const config = { ...DEFAULTS, reminder_days: [...DEFAULTS.reminder_days] };
  for (const row of rows) {
    const name = row.key.slice(PREFIX.length);
    try { config[name] = JSON.parse(row.value); } catch { /* A malformed setting retains its safe default. */ }
  }
  config.enabled = config.enabled === true;
  if (!["disabled", "simulation", "live"].includes(config.mode)) config.mode = "disabled";
  config.reminder_days = Array.isArray(config.reminder_days)
    ? [...new Set(config.reminder_days.filter((n) => Number.isInteger(n) && n >= 1 && n <= 30))].slice(0, 5) : [3, 1];
  config.reminder_hour = Number.isInteger(config.reminder_hour) && config.reminder_hour >= 0 && config.reminder_hour <= 23 ? config.reminder_hour : 9;
  config.daily_sms_cap = Math.min(100, Math.max(1, Number(config.daily_sms_cap) || 10));
  for (const name of ["reminder_template", "followup_template"]) {
    if (typeof config[name] !== "string" || !config[name].trim() || config[name].length > 480) config[name] = DEFAULTS[name];
  }
  return config;
};
const transportState = () => ({
  sms_delivery_enabled: process.env.SMS_DELIVERY_ENABLED === "true",
  provider_configured: Boolean(process.env.MOCEAN_API_KEY && process.env.MOCEAN_API_SECRET && process.env.MOCEAN_SENDER_ID),
  recipient_restriction_configured: process.env.SMS_ALLOW_ALL_OPTED_IN === "true" || Boolean((process.env.SMS_ALLOWED_RECIPIENTS || "").trim()),
  scheduler_enabled: process.env.OUTREACH_SCHEDULER_ENABLED !== "false" && process.env.NODE_ENV !== "test",
});
const saveConfiguration = async (data, user) => {
  if (data.mode === "live") {
    const state = transportState();
    if (!state.sms_delivery_enabled || !state.provider_configured || !state.recipient_restriction_configured) {
      throw AppError.conflict("LIVE_SMS_DISABLED", "Live SMS is not enabled on this server. Use Disabled or Simulation.");
    }
  }
  await sequelize.transaction(async (transaction) => {
    for (const [name, value] of Object.entries(data)) {
      const setting = await SystemSetting.findOne({ where: { key: PREFIX + name }, transaction, lock: transaction.LOCK.UPDATE });
      if (setting) await setting.update({ value: JSON.stringify(value), updated_by: user.userId }, { transaction });
      else await SystemSetting.create({ key: PREFIX + name, value: JSON.stringify(value), updated_by: user.userId }, { transaction });
    }
    await AuditLog.create({ user_id: user.userId, action: "OUTREACH_CONFIGURATION_UPDATED", target_table: "system_settings", new_values: data }, { transaction });
  });
  return getConfiguration();
};
module.exports = { getConfiguration, saveConfiguration, transportState };
