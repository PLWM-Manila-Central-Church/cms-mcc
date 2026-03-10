"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("permissions", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      module: { type: Sequelize.STRING(100), allowNull: false },
      action: { type: Sequelize.STRING(100), allowNull: false },
      description: { type: Sequelize.STRING(255), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("permissions", {
      fields: ["module", "action"],
      type: "unique",
      name: "unique_module_action",
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("permissions"),
};
