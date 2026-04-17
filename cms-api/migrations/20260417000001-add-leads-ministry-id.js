"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "leads_cell_group_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn("users", "leads_group_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn("users", "leads_ministry_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("users", "leads_cell_group_id");
    await queryInterface.removeColumn("users", "leads_group_id");
    await queryInterface.removeColumn("users", "leads_ministry_id");
  },
};