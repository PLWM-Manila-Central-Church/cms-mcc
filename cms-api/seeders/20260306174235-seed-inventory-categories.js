"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    let existingNames = new Set();
    try {
      const existingCats = await queryInterface.sequelize.query(
        "SELECT name FROM inventory_categories",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      existingNames = new Set(existingCats.map(c => c.name));
    } catch (err) {
      console.log("Warning: Could not check existing inventory_categories, continuing anyway:", err.message);
    }

    const categoriesToAdd = [
      { name: "Audio Equipment" },
      { name: "Visual Equipment" },
      { name: "Furniture" },
      { name: "Office Supplies" },
      { name: "Cleaning Supplies" },
      { name: "Kitchen Supplies" },
      { name: "Instruments" },
      { name: "Bibles & Books" },
      { name: "Event Supplies" },
      { name: "Others" },
    ].filter(c => !existingNames.has(c.name)).map(c => ({
      ...c,
      created_at: now,
      updated_at: now,
    }));

    if (categoriesToAdd.length > 0) {
      try {
        await queryInterface.bulkInsert("inventory_categories", categoriesToAdd);
      } catch (err) {
        if (err.message && err.message.includes("Duplicate")) {
          console.log("Inventory categories already exist, skipping insert");
        } else {
          throw err;
        }
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("inventory_categories", null, {});
  },
};
