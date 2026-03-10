"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("archive_versions", {
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
      file_url: { type: Sequelize.STRING(500), allowNull: false },
      file_type: { type: Sequelize.STRING(50), allowNull: false },
      version_number: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      uploaded_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("archive_versions"),
};
