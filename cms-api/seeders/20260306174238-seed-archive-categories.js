"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    let existingNames = new Set();
    try {
      const existingCats = await queryInterface.sequelize.query(
        "SELECT name FROM archive_categories",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      existingNames = new Set(existingCats.map(c => c.name));
    } catch (err) {
      console.log("Warning: Could not check existing archive_categories, continuing anyway:", err.message);
    }

    const categoriesToAdd = [
      { name: "Financial Records", description: "Official financial reports and documents" },
      { name: "Legal Documents", description: "Church legal documents, permits, and registrations" },
      { name: "Meeting Minutes", description: "Minutes from leadership and board meetings" },
      { name: "Sermons", description: "Sermon recordings, notes, and manuscripts" },
      { name: "Event Materials", description: "Event programs, posters, and related materials" },
      { name: "Media", description: "Photos, videos, and other media files" },
      { name: "Member Documents", description: "Member-related documents and forms" },
      { name: "Others", description: "Other miscellaneous documents" },
    ].filter(c => !existingNames.has(c.name)).map(c => ({
      ...c,
      created_at: now,
      updated_at: now,
    }));

    if (categoriesToAdd.length > 0) {
      try {
        await queryInterface.bulkInsert("archive_categories", categoriesToAdd);
      } catch (err) {
        if (err.message && err.message.includes("Duplicate")) {
          console.log("Archive categories already exist, skipping insert");
        } else {
          throw err;
        }
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("archive_categories", null, {});
  },
};
