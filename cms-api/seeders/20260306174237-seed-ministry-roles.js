"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    let existingNames = new Set();
    try {
      const existing = await queryInterface.sequelize.query(
        "SELECT name FROM ministry_roles",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      existingNames = new Set(existing.map(r => r.name));
    } catch (err) {
      console.log("Warning: Could not check existing ministry_roles, continuing anyway:", err.message);
    }

    const rolesToAdd = [
      { name: "Worship Leader" },
      { name: "Vocalist" },
      { name: "Guitarist" },
      { name: "Bassist" },
      { name: "Drummer" },
      { name: "Keyboardist" },
      { name: "Sound Engineer" },
      { name: "Lights Operator" },
      { name: "Projection Operator" },
      { name: "Livestream Operator" },
      { name: "Usher" },
      { name: "Greeter" },
      { name: "Prayer Team" },
      { name: "Kids Church Leader" },
      { name: "Kids Church Helper" },
      { name: "Security" },
      { name: "Parking" },
      { name: "Others" },
    ].filter(r => !existingNames.has(r.name)).map(r => ({
      ...r,
      created_at: now,
      updated_at: now,
    }));

    if (rolesToAdd.length > 0) {
      try {
        await queryInterface.bulkInsert("ministry_roles", rolesToAdd);
      } catch (err) {
        if (err.message && err.message.includes("Duplicate")) {
          console.log("Ministry roles already exist, skipping insert");
        } else {
          throw err;
        }
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("ministry_roles", null, {});
  },
};
