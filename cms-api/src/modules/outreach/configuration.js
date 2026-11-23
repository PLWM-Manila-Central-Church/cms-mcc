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
  config.campaigns_enabled = config.campaigns_enabled === true;
  config.campaign_unit_cost_php = Math.min(100, Math.max(0, Number(config.campaign_unit_cost_php) || DEFAULTS.campaign_unit_cost_php));
  config.campaign_monthly_budget_php = Math.min(1000000, Math.max(0, Number(config.campaign_monthly_budget_php) || DEFAULTS.campaign_monthly_budget_php));
  config.campaign_weekly_member_cap = Math.min(20, Math.max(1, Number(config.campaign_weekly_member_cap) || 2));
  config.campaign_monthly_member_cap = Math.min(100, Math.max(1, Number(config.campaign_monthly_member_cap) || 6));
  config.campaign_approval_recipient_threshold = Math.min(10000, Math.max(1, Number(config.campaign_approval_recipient_threshold) || 50));
  config.campaign_approval_cost_threshold = Math.min(100000, Math.max(0, Number(config.campaign_approval_cost_threshold) || 50));
  config.campaign_quiet_start = Math.min(23, Math.max(0, Number(config.campaign_quiet_start) || 8));
  config.campaign_quiet_end = Math.min(23, Math.max(1, Number(config.campaign_quiet_end) || 20));
  for (const name of ["reminder_template", "followup_template"]) {
    if (typeof config[name] !== "string" || !config[name].trim() || config[name].length > 480) config[name] = DEFAULTS[name];
  }
  return config;
};
const transportState = () => ({
  sms_delivery_enabled: process.env.SMS_DELIVERY_ENABLED === "true",
  provider_configured: Boolean(process.env.MOCEAN_SENDER_ID && (process.env.MOCEAN_API_TOKEN || (process.env.MOCEAN_API_KEY && process.env.MOCEAN_API_SECRET))),
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
