"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("archive_records", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      category_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "archive_categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      file_url: { type: Sequelize.STRING(500), allowNull: false },
      file_type: {
        type: Sequelize.ENUM("pdf", "docx", "xlsx", "jpg", "png", "mp4", "mp3"),
        allowNull: false,
      },
      file_size: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        comment: "File size in kilobytes",
      },
      document_date: { type: Sequelize.DATEONLY, allowNull: true },
      visibility: {
        type: Sequelize.ENUM("public", "restricted", "confidential"),
        allowNull: false,
        defaultValue: "public",
      },
      status: {
        type: Sequelize.ENUM("pending", "approved", "deleted"),
        allowNull: false,
        defaultValue: "pending",
      },
      uploaded_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      approved_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      is_deleted: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      deleted_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("archive_records", {
      fields: ["status", "is_deleted"],
      name: "idx_archive_records_status_deleted",
    });
    await queryInterface.addIndex("archive_records", {
      fields: ["category_id", "is_deleted"],
      name: "idx_archive_records_category_deleted",
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("archive_records"),
};
