"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("attendances", {
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
      check_in_method: {
        type: Sequelize.ENUM("barcode", "manual", "pre-reg"),
        allowNull: false,
      },
      checked_in_at: { type: Sequelize.DATE, allowNull: false },
      recorded_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
    });

    await queryInterface.addConstraint("attendances", {
      fields: ["service_id", "member_id"],
      type: "unique",
      name: "unique_service_member_attendance",
    });

    await queryInterface.addIndex("attendances", {
      fields: ["checked_in_at"],
      name: "idx_attendances_checked_in_at",
    });

    await queryInterface.addIndex("attendances", {
      fields: ["service_id", "check_in_method"],
      name: "idx_attendances_service_method",
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("attendances"),
};
