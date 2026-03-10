"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("user_sessions", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      device: { type: Sequelize.STRING(255), allowNull: true },
      login_at: { type: Sequelize.DATE, allowNull: false },
      logout_at: { type: Sequelize.DATE, allowNull: true },
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("user_sessions"),
};
