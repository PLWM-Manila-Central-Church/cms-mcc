"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const cellGroups = [
      ["Cell Group 11 UPS 5", "UPS 5"],
      ["Cell Group 12 Sucat", "Sucat"],
      ["Cell Group 13 Tambo", "Tambo"],
      ["Cell Group 14 Silverio", "Silverio"],
      ["Cell Group 21 Delara", "Delara"],
      ["Cell Group 22 Sampaloc", "Sampaloc"],
      ["Cell Group 23 4TH Estate", "4TH Estate"],
      ["Cell Group 24 BF", "BF"],
      ["Cell Group 31 CAA", "CAA"],
      ["Cell Group 32 TS Cruz", "TS Cruz"],
      ["Cell Group 33 Las Pinas", "Las Pinas"],
      ["Cell Group 41 Masville", "Masville"],
      ["Cell Group 42 Waterfun", "Waterfun"],
      ["Cell Group 43 Taguig", "Taguig"],
      ["Cell Group 51 Lakefront", "Lakefront"],
      ["Cell Group 52 Lakefront B", "Lakefront B"],
      ["Cell Group 53 Don Bosco", "Don Bosco"],
    ];

    for (const [name, area] of cellGroups) {
      await queryInterface.sequelize.query(
        `INSERT IGNORE INTO cell_groups (name, area, created_at, updated_at) VALUES (?, ?, NOW(), NOW())`,
        { replacements: [name, area] }
      );
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("cell_groups", null, {});
  },
};
