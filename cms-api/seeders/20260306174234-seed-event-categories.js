"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert("event_categories", [
      {
        name: "Worship Night",
        description: "Special worship and praise events",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Conference",
        description: "Church-wide conferences and conventions",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Seminar",
        description: "Educational and discipleship seminars",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Outreach",
        description: "Community outreach and mission events",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Fellowship",
        description: "Social gatherings and fellowship activities",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Youth Event",
        description: "Events specifically for youth and young adults",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Kids Event",
        description: "Events for children and elementary age members",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Leadership",
        description: "Leadership training and meetings",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Special Service",
        description: "Special services like Easter, Christmas, and more",
        created_at: now,
        updated_at: now,
      },
      {
        name: "Others",
        description: "Other miscellaneous church events",
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("event_categories", null, {});
  },
};
