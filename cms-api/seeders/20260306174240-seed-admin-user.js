"use strict";
const bcrypt = require("bcrypt");
const crypto = require("crypto");

module.exports = {
  up: async (queryInterface) => {
    let existingEmail = null;
    try {
      const existing = await queryInterface.sequelize.query(
        "SELECT email FROM users WHERE email = 'admin@plwmmcc.com'",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      if (existing.length > 0) {
        existingEmail = existing[0].email;
      }
    } catch (err) {
      console.log("Warning: Could not check existing users, continuing anyway:", err.message);
    }

    if (existingEmail) {
      console.log("Admin user already exists, skipping insert");
      return;
    }

    const now = new Date();
    // Random per-run password — printed once below so the operator can log in
    // and is forced to change it on first use. Never commit a real password here.
    const password = `Admin_${crypto.randomBytes(12).toString("hex")}!`;
    const password_hash = await bcrypt.hash(password, 10);

    try {
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
      console.log("=".repeat(60));
      console.log("Initial admin account: admin@plwmmcc.com");
      console.log(`One-time generated password: ${password}`);
      console.log("SAVE IT NOW — it is not shown again. You will be");
      console.log("forced to change it on first login.");
      console.log("=".repeat(60));
    } catch (err) {
      if (err.message && err.message.includes("Duplicate")) {
        console.log("Admin user already exists, skipping insert");
      } else {
        throw err;
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete(
      "users",
      { email: "admin@plwmmcc.com" },
      {},
    );
  },
};
