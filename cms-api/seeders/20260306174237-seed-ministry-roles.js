"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert("ministry_roles", [
      { name: "Choir", created_at: now, updated_at: now },
      { name: "Church School Teachers", created_at: now, updated_at: now },
      { name: "Facility Maintenance Team", created_at: now, updated_at: now },
      { name: "Deaf", created_at: now, updated_at: now },
      { name: "Women's Group Leaders", created_at: now, updated_at: now },
      { name: "Men's Group Leaders", created_at: now, updated_at: now },
      { name: "YA Group Leaders", created_at: now, updated_at: now },
      { name: "Finance Ministry", created_at: now, updated_at: now },
      { name: "Registration Team", created_at: now, updated_at: now },
      { name: "Media Team", created_at: now, updated_at: now },
      { name: "Parking and Marshal", created_at: now, updated_at: now },
      { name: "Usher Team", created_at: now, updated_at: now },
      { name: "Broadcasting", created_at: now, updated_at: now },
      { name: "New Comers Committee", created_at: now, updated_at: now },
      { name: "Counselors", created_at: now, updated_at: now },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("ministry_roles", null, {});
  },
};
