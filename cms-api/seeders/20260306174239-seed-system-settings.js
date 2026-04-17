"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    let existingKeys = new Set();
    try {
      const existing = await queryInterface.sequelize.query(
        "SELECT `key` FROM system_settings",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      existingKeys = new Set(existing.map(s => s.key));
    } catch (err) {
      console.log("Warning: Could not check existing system_settings, continuing anyway:", err.message);
    }

    const settingsToAdd = [
      { key: "church_name", value: "PLWM-MCC", updated_by: null },
      { key: "church_address", value: null, updated_by: null },
      { key: "church_email", value: null, updated_by: null },
      { key: "church_phone", value: null, updated_by: null },
      { key: "service_capacity", value: "500", updated_by: null },
      { key: "max_parking_slots", value: "100", updated_by: null },
      { key: "invite_expiry_hours", value: "48", updated_by: null },
      { key: "max_file_size_mb", value: "25", updated_by: null },
      { key: "allowed_file_types", value: "pdf,docx,xlsx,jpg,png,mp4,mp3", updated_by: null },
      { key: "low_stock_alert", value: "1", updated_by: null },
      { key: "finance_fiscal_month", value: "1", updated_by: null },
      { key: "attendance_barcode_mode", value: "1", updated_by: null },
      { key: "system_version", value: "3.0.0", updated_by: null },
    ].filter(s => !existingKeys.has(s.key)).map(s => ({
      ...s,
      updated_at: now,
    }));

    if (settingsToAdd.length > 0) {
      try {
        await queryInterface.bulkInsert("system_settings", settingsToAdd);
      } catch (err) {
        if (err.message && err.message.includes("Duplicate")) {
          console.log("System settings already exist, skipping insert");
        } else {
          throw err;
        }
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("system_settings", null, {});
  },
};
