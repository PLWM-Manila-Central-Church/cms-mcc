"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Temporarily disable FK checks to handle FK references
    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    
    // Rename table
    await queryInterface.renameTable("groups", "ministry_groups");
    
    // Re-enable FK checks
    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    await queryInterface.renameTable("ministry_groups", "groups");
    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
  },
};