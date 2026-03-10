"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert("ministry_roles", [
      { name: "Worship Leader", created_at: now, updated_at: now },
      { name: "Vocalist", created_at: now, updated_at: now },
      { name: "Guitarist", created_at: now, updated_at: now },
      { name: "Bassist", created_at: now, updated_at: now },
      { name: "Drummer", created_at: now, updated_at: now },
      { name: "Keyboardist", created_at: now, updated_at: now },
      { name: "Sound Engineer", created_at: now, updated_at: now },
      { name: "Lights Operator", created_at: now, updated_at: now },
      { name: "Projection Operator", created_at: now, updated_at: now },
      { name: "Livestream Operator", created_at: now, updated_at: now },
      { name: "Usher", created_at: now, updated_at: now },
      { name: "Greeter", created_at: now, updated_at: now },
      { name: "Prayer Team", created_at: now, updated_at: now },
      { name: "Kids Church Leader", created_at: now, updated_at: now },
      { name: "Kids Church Helper", created_at: now, updated_at: now },
      { name: "Security", created_at: now, updated_at: now },
      { name: "Parking", created_at: now, updated_at: now },
      { name: "Others", created_at: now, updated_at: now },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("ministry_roles", null, {});
  },
};
