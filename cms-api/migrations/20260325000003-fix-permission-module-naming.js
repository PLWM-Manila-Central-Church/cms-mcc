"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      "UPDATE permissions SET module = 'cell_groups' WHERE module = 'cellgroups'"
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      "UPDATE permissions SET module = 'cellgroups' WHERE module = 'cell_groups'"
    );
  },
};