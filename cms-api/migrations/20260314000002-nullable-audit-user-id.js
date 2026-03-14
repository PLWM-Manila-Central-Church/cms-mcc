"use strict";

// Makes audit_logs.user_id nullable so users can be hard-deleted
// while preserving their audit history (user_id set to NULL on delete)

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn("audit_logs", "user_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    console.log("✓ audit_logs.user_id is now nullable.");
  },

  down: async (queryInterface, Sequelize) => {
    // First nullify any orphaned rows so the NOT NULL constraint doesn't fail
    await queryInterface.sequelize.query(
      "UPDATE audit_logs SET user_id = 0 WHERE user_id IS NULL"
    );
    await queryInterface.changeColumn("audit_logs", "user_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
    });
  },
};
