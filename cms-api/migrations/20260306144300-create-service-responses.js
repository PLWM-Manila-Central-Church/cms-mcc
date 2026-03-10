"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("service_responses", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      service_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "services", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      attendance_status: {
        type: Sequelize.ENUM("ATTENDING", "NOT_ATTENDING", "UNDECIDED"),
        allowNull: false,
      },
      seat_number: { type: Sequelize.STRING(10), allowNull: true },
      parking_slot: { type: Sequelize.STRING(10), allowNull: true },
      override_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      override_reason: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("service_responses", {
      fields: ["service_id", "member_id"],
      unique: true,
      name: "unique_service_member_response",
    });

    await queryInterface.addIndex("service_responses", {
      fields: ["service_id", "seat_number"],
      unique: true,
      name: "unique_service_seat",
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("service_responses"),
};
