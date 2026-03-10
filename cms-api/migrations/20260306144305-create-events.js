"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("events", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      category_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "event_categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      title: { type: Sequelize.STRING(150), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      location: { type: Sequelize.STRING(255), allowNull: true },
      capacity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      registration_deadline: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM("draft", "published", "cancelled", "completed"),
        allowNull: false,
        defaultValue: "draft",
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
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("events", {
      fields: ["status", "is_deleted"],
      name: "idx_events_status_deleted",
    });
    await queryInterface.addIndex("events", {
      fields: ["start_date"],
      name: "idx_events_start_date",
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("events"),
};
