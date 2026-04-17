"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const existingGroups = await queryInterface.sequelize.query(
      "SELECT name FROM groups",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const existingNames = new Set(existingGroups.map(g => g.name));

    const groupsToAdd = [
      { name: "Men's Group" },
      { name: "Women's Group" },
      { name: "Young Adults" },
      { name: "High School" },
      { name: "Elementary" },
      { name: "Preschool" },
    ].filter(g => !existingNames.has(g.name)).map(g => ({
      name: g.name,
      created_at: now,
      updated_at: now,
    }));

    if (groupsToAdd.length > 0) {
      await queryInterface.bulkInsert("groups", groupsToAdd);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("groups", null, {});
  },
};
