"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable("members");
    if (!columns.estimated_join_date) {
      await queryInterface.addColumn("members", "estimated_join_date", { type: Sequelize.DATEONLY, allowNull: true });
    }
  },
  async down(queryInterface) {
    await queryInterface.removeColumn("members", "estimated_join_date");
  },
};
