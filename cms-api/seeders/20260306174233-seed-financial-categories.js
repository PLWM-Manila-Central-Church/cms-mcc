"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert("financial_categories", [
      {
        name: "Tithes",
        description: "Regular tithe contributions from members",
        is_active: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Offering",
        description: "General love offerings during services",
        is_active: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Pledge",
        description: "Pledge",
        is_active: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Missions",
        description: "Contributions for local missions",
        is_active: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Building Fund",
        description: "Contributions for church building and maintenance",
        is_active: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Events",
        description: "Payments and contributions for church events",
        is_active: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Cell Group Fund",
        description: "Contributions for cell group activities",
        is_active: 1,
        created_at: now,
        updated_at: now,
      },
      {
        name: "Others",
        description: "Other miscellaneous financial contributions",
        is_active: 1,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("financial_categories", null, {});
  },
};
