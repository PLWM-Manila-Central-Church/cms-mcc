"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    for (const table of ["events", "services"]) {
      const columns = await queryInterface.describeTable(table);
      if (!columns.calendar_source_key) {
        await queryInterface.addColumn(table, "calendar_source_key", { type: Sequelize.STRING(90), allowNull: true });
      }
      const indexes = await queryInterface.showIndex(table);
      if (!indexes.some((index) => index.name === "uq_" + table + "_calendar_source")) {
        await queryInterface.addIndex(table, ["calendar_source_key"], { name: "uq_" + table + "_calendar_source", unique: true });
      }
    }
  },
  async down(queryInterface) {
    for (const table of ["events", "services"]) await queryInterface.removeColumn(table, "calendar_source_key");
  },
};
