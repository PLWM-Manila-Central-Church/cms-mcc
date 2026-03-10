"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert("groups", [
      { name: "Men's Group", created_at: now, updated_at: now },
      { name: "Women's Group", created_at: now, updated_at: now },
      { name: "Young Adults", created_at: now, updated_at: now },
      { name: "High School", created_at: now, updated_at: now },
      { name: "Elementary", created_at: now, updated_at: now },
      { name: "Preschool", created_at: now, updated_at: now },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("groups", null, {});
  },
};
