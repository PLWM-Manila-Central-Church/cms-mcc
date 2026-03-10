"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert("inventory_categories", [
      { name: "Audio Equipment", created_at: now, updated_at: now },
      { name: "Visual Equipment", created_at: now, updated_at: now },
      { name: "Furniture", created_at: now, updated_at: now },
      { name: "Office Supplies", created_at: now, updated_at: now },
      { name: "Cleaning Supplies", created_at: now, updated_at: now },
      { name: "Kitchen Supplies", created_at: now, updated_at: now },
      { name: "Instruments", created_at: now, updated_at: now },
      { name: "Bibles & Books", created_at: now, updated_at: now },
      { name: "Event Supplies", created_at: now, updated_at: now },
      { name: "Others", created_at: now, updated_at: now },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("inventory_categories", null, {});
  },
};
