"use strict";

module.exports = {
  up: async (queryInterface) => {
    const groups = [
      ["Men's Group"],
      ["Women's Group"],
      ["Young Adults"],
      ["High School"],
      ["Elementary"],
      ["Preschool"],
    ];

    for (const [name] of groups) {
      await queryInterface.sequelize.query(
        "INSERT IGNORE INTO ?? (name, created_at, updated_at) VALUES (?, NOW(), NOW())",
        { replacements: ["groups", name] }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("groups", null, {});
  },
};
