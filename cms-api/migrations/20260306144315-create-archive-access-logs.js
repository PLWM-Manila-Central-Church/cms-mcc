"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("archive_access_logs", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      record_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "archive_records", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      accessed_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      action: { type: Sequelize.ENUM("view", "download"), allowNull: false },
      accessed_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) =>
    queryInterface.dropTable("archive_access_logs"),
};
