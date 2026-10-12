"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable("inventory_requests");
    if (!columns.review_note) {
      await queryInterface.addColumn("inventory_requests", "review_note", {
        type: Sequelize.TEXT,
        allowNull: true,
      });
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable("inventory_requests");
    if (columns.review_note) {
      await queryInterface.removeColumn("inventory_requests", "review_note");
    }
  },
};
