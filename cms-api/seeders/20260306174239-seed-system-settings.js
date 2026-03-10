"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert("system_settings", [
      {
        key: "church_name",
        value: "PLWM-MCC",
        updated_by: null,
        updated_at: now,
      },
      { key: "church_address", value: null, updated_by: null, updated_at: now },
      { key: "church_email", value: null, updated_by: null, updated_at: now },
      { key: "church_phone", value: null, updated_by: null, updated_at: now },
      {
        key: "service_capacity",
        value: "500",
        updated_by: null,
        updated_at: now,
      },
      {
        key: "max_parking_slots",
        value: "100",
        updated_by: null,
        updated_at: now,
      },
      {
        key: "invite_expiry_hours",
        value: "48",
        updated_by: null,
        updated_at: now,
      },
      {
        key: "max_file_size_mb",
        value: "25",
        updated_by: null,
        updated_at: now,
      },
      {
        key: "allowed_file_types",
        value: "pdf,docx,xlsx,jpg,png,mp4,mp3",
        updated_by: null,
        updated_at: now,
      },
      { key: "low_stock_alert", value: "1", updated_by: null, updated_at: now },
      {
        key: "finance_fiscal_month",
        value: "1",
        updated_by: null,
        updated_at: now,
      },
      {
        key: "attendance_barcode_mode",
        value: "1",
        updated_by: null,
        updated_at: now,
      },
      {
        key: "system_version",
        value: "3.0.0",
        updated_by: null,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("system_settings", null, {});
  },
};
