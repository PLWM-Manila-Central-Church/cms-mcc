"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ministry_memberships", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      ministry_role_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "ministry_roles", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      added_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
      },
    });
    await queryInterface.addIndex(
      "ministry_memberships",
      ["ministry_role_id", "member_id"],
      { unique: true, name: "uq_mm_role_member" }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("ministry_memberships");
  },
};
