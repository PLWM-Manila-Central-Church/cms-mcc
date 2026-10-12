"use strict";

const CATEGORIES = [
  ["Tithes", "Regular tithe contributions from members"],
  ["Offering", "General love offerings during services"],
  ["Pledge", "Pledge"],
  ["Missions", "Contributions for local missions"],
  ["Building Fund", "Contributions for church building and maintenance"],
  ["Events", "Payments and contributions for church events"],
  ["Cell Group Fund", "Contributions for cell group activities"],
  ["Others", "Other miscellaneous financial contributions"],
];

module.exports = {
  async up(queryInterface) {
    for (const [name, description] of CATEGORIES) {
      await queryInterface.sequelize.query(
        "INSERT IGNORE INTO financial_categories (name, description, is_active, created_at, updated_at) VALUES (?, ?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
        { replacements: [name, description] },
      );
    }
  },

  async down() {
    throw new Error(
      "Default giving categories are required by the Finance module; use a reviewed forward migration to change them.",
    );
  },
};
