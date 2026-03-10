"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert("archive_categories", [
      {
        name: "Financial Records",
        description: "Official financial reports and documents",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Legal Documents",
        description: "Church legal documents, permits, and registrations",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Meeting Minutes",
        description: "Minutes from leadership and board meetings",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Sermons",
        description: "Sermon recordings, notes, and manuscripts",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Event Materials",
        description: "Event programs, posters, and related materials",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Media",
        description: "Photos, videos, and other media files",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Member Documents",
        description: "Member-related documents and forms",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Others",
        description: "Other miscellaneous documents",
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("archive_categories", null, {});
  },
};
