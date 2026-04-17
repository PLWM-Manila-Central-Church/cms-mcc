"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    let existingNames = new Set();
    try {
      const existingCats = await queryInterface.sequelize.query(
        "SELECT name FROM financial_categories",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      existingNames = new Set(existingCats.map(c => c.name));
    } catch (err) {
      console.log("Warning: Could not check existing financial_categories, continuing anyway:", err.message);
    }

    const categoriesToAdd = [
      {
        name: "Tithes",
        description: "Regular tithe contributions from members",
        is_active: 1,
      },
      {
        name: "Offering",
        description: "General love offerings during services",
        is_active: 1,
      },
      {
        name: "Pledge",
        description: "Pledge",
        is_active: 1,
      },
      {
        name: "Missions",
        description: "Contributions for local missions",
        is_active: 1,
      },
      {
        name: "Building Fund",
        description: "Contributions for church building and maintenance",
        is_active: 1,
      },
      {
        name: "Events",
        description: "Payments and contributions for church events",
        is_active: 1,
      },
      {
        name: "Cell Group Fund",
        description: "Contributions for cell group activities",
        is_active: 1,
      },
      {
        name: "Others",
        description: "Other miscellaneous financial contributions",
        is_active: 1,
      },
    ].filter(c => !existingNames.has(c.name)).map(c => ({
      ...c,
      created_at: now,
      updated_at: now,
    }));

    if (categoriesToAdd.length > 0) {
      try {
        await queryInterface.bulkInsert("financial_categories", categoriesToAdd);
      } catch (err) {
        if (err.message && err.message.includes("Duplicate")) {
          console.log("Financial categories already exist, skipping insert");
        } else {
          throw err;
        }
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("financial_categories", null, {});
  },
};
