"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    let existingNames = new Set();
    try {
      const existingGroups = await queryInterface.sequelize.query(
        "SELECT name FROM `groups`",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      existingNames = new Set(existingGroups.map(g => g.name));
    } catch (err) {
      console.log("Warning: Could not check existing groups, continuing anyway:", err.message);
    }

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
      try {
        await queryInterface.bulkInsert("groups", groupsToAdd);
      } catch (err) {
        if (err.message && err.message.includes("Duplicate")) {
          console.log("Groups already exist, skipping insert");
        } else {
          throw err;
        }
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("groups", null, {});
  },
};
