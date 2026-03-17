"use strict";

/**
 * Migration: seed missing system_settings rows
 *
 * The original seeder only created 13 keys. SETTING_META defines 33.
 * The 20 missing keys are inserted here with safe defaults.
 *
 * Uses INSERT IGNORE (via individualHooks: false + ignoreDuplicates: true)
 * so this is safe to run on a DB that already has some of these keys.
 */

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Use raw SQL INSERT IGNORE so rows that already exist are safely skipped
    const rows = [
      { key: "church_website",           value: null },
      { key: "system_timezone",          value: "Asia/Manila" },
      { key: "default_timezone",         value: "Asia/Manila" },
      { key: "maintenance_mode",         value: "false" },
      { key: "currency",                 value: "PHP" },
      { key: "currency_symbol",          value: "₱" },
      { key: "fiscal_year_start",        value: "1" },
      { key: "default_payment_method",   value: "cash" },
      { key: "allow_self_register",      value: "false" },
      { key: "require_approval",         value: "true" },
      { key: "default_member_status",    value: "Active" },
      { key: "barcode_auto_generate",    value: "false" },
      { key: "max_attendance_cap",       value: "500" },
      { key: "default_service_status",   value: "draft" },
      { key: "default_event_visibility", value: "public" },
      { key: "enable_notifications",     value: "true" },
      { key: "email_notifications",      value: "true" },
      { key: "max_failed_logins",        value: "5" },
      { key: "session_timeout_hours",    value: "8" },
    ];

    for (const row of rows) {
      await queryInterface.sequelize.query(
        `INSERT IGNORE INTO system_settings (\`key\`, \`value\`, updated_by, updated_at)
         VALUES (?, ?, NULL, ?)`,
        { replacements: [row.key, row.value, now] },
      );
    }
  },

  down: async (queryInterface) => {
    const keys = [
      "church_website", "system_timezone", "default_timezone", "maintenance_mode",
      "currency", "currency_symbol", "fiscal_year_start", "default_payment_method",
      "allow_self_register", "require_approval", "default_member_status",
      "barcode_auto_generate", "max_attendance_cap", "default_service_status",
      "default_event_visibility", "enable_notifications", "email_notifications",
      "max_failed_logins", "session_timeout_hours",
    ];
    await queryInterface.bulkDelete("system_settings", { key: keys }, {});
  },
};
