"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    let existingNames = new Set();
    try {
      const existingCellGroups = await queryInterface.sequelize.query(
        "SELECT name FROM cell_groups",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      existingNames = new Set(existingCellGroups.map(cg => cg.name));
    } catch (err) {
      console.log("Warning: Could not check existing cell_groups, continuing anyway:", err.message);
    }

    const cellGroupsToAdd = [
      { name: "Cell Group 11 UPS 5", area: "UPS 5" },
      { name: "Cell Group 12 Sucat", area: "Sucat" },
      { name: "Cell Group 13 Tambo", area: "Tambo" },
      { name: "Cell Group 14 Silverio", area: "Silverio" },
      { name: "Cell Group 21 Delara", area: "Delara" },
      { name: "Cell Group 22 Sampaloc", area: "Sampaloc" },
      { name: "Cell Group 23 4TH Estate", area: "4TH Estate" },
      { name: "Cell Group 24 BF", area: "BF" },
      { name: "Cell Group 31 CAA", area: "CAA" },
      { name: "Cell Group 32 TS Cruz", area: "TS Cruz" },
      { name: "Cell Group 33 Las Pinas", area: "Las Pinas" },
      { name: "Cell Group 41 Masville", area: "Masville" },
      { name: "Cell Group 42 Waterfun", area: "Waterfun" },
      { name: "Cell Group 43 Taguig", area: "Taguig" },
      { name: "Cell Group 51 Lakefront", area: "Lakefront" },
      { name: "Cell Group 52 Lakefront B", area: "Lakefront B" },
      { name: "Cell Group 53 Don Bosco", area: "Don Bosco" },
    ].filter(cg => !existingNames.has(cg.name)).map(cg => ({
      name: cg.name,
      area: cg.area,
      created_at: now,
      updated_at: now,
    }));

    if (cellGroupsToAdd.length > 0) {
      try {
        await queryInterface.bulkInsert("cell_groups", cellGroupsToAdd);
      } catch (err) {
        if (err.message && err.message.includes("Duplicate")) {
          console.log("Cell groups already exist, skipping insert");
        } else {
          throw err;
        }
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("cell_groups", null, {});
  },
};
