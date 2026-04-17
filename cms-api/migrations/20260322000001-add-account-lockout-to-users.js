"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "failed_login_attempts", {
      type:         Sequelize.INTEGER,
      defaultValue: 0,
      allowNull:    false,
    });
    await queryInterface.addColumn("users", "locked_until", {
      type:      Sequelize.DATE,
      allowNull: true,
      defaultValue: null,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("users", "failed_login_attempts");
    await queryInterface.removeColumn("users", "locked_until");
  },
};
