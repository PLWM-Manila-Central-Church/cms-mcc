"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    let existingNames = new Set();
    try {
      const existingCats = await queryInterface.sequelize.query(
        "SELECT name FROM event_categories",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      existingNames = new Set(existingCats.map(c => c.name));
    } catch (err) {
      console.log("Warning: Could not check existing event_categories, continuing anyway:", err.message);
    }

    const categoriesToAdd = [
      { name: "Worship Night", description: "Special worship and praise events" },
      { name: "Conference", description: "Church-wide conferences and conventions" },
      { name: "Seminar", description: "Educational and discipleship seminars" },
      { name: "Outreach", description: "Community outreach and mission events" },
      { name: "Fellowship", description: "Social gatherings and fellowship activities" },
      { name: "Youth Event", description: "Events specifically for youth and young adults" },
      { name: "Kids Event", description: "Events for children and elementary age members" },
      { name: "Leadership", description: "Leadership training and meetings" },
      { name: "Special Service", description: "Special services like Easter, Christmas, and more" },
      { name: "Others", description: "Other miscellaneous church events" },
    ].filter(c => !existingNames.has(c.name)).map(c => ({
      ...c,
      created_at: now,
      updated_at: now,
    }));

    if (categoriesToAdd.length > 0) {
      try {
        await queryInterface.bulkInsert("event_categories", categoriesToAdd);
      } catch (err) {
        if (err.message && err.message.includes("Duplicate")) {
          console.log("Event categories already exist, skipping insert");
        } else {
          throw err;
        }
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("event_categories", null, {});
  },
};
