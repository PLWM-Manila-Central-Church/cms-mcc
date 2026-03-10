"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ministry_assignments", {
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
      ministry_role_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "ministry_roles", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      confirmed: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
      substitute_requested: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("ministry_assignments", {
      fields: ["service_id", "member_id"],
      unique: true,
      name: "unique_service_member_assignment",
    });
  },
  down: async (queryInterface) =>
    queryInterface.dropTable("ministry_assignments"),
};
