"use strict";
const bcrypt = require("bcrypt");

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const password_hash = await bcrypt.hash("Admin@12345", 10);

    await queryInterface.bulkInsert("users", [
      {
        role_id: 1,
        member_id: null,
        invited_member_id: null,
        email: "admin@plwmmcc.com",
        password_hash,
        is_active: 1,
        force_password_change: 1,
        last_login_at: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete(
      "users",
      { email: "admin@plwmmcc.com" },
      {},
    );
  },
};
