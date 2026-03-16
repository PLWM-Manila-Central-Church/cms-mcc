"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("events", "start_time", {
      type: Sequelize.TIME,
      allowNull: true,
      after: "end_date",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeColumn("events", "start_time");
  },
};
