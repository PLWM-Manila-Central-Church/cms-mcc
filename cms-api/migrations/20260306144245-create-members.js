"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("members", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      first_name: { type: Sequelize.STRING(100), allowNull: false },
      last_name: { type: Sequelize.STRING(100), allowNull: false },
      email: { type: Sequelize.STRING(150), allowNull: true, unique: true },
      phone: { type: Sequelize.STRING(30), allowNull: true },
      birthdate: { type: Sequelize.DATEONLY, allowNull: true },
      spiritual_birthday: { type: Sequelize.DATEONLY, allowNull: true },
      address: { type: Sequelize.TEXT, allowNull: true },
      gender: {
        type: Sequelize.ENUM("Male", "Female"),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM("Active", "Inactive", "Visitor"),
        allowNull: false,
        defaultValue: "Active",
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
      },

      cell_group_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "cell_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      group_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      referred_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      profile_photo_url: { type: Sequelize.STRING(255), allowNull: true },
      barcode: { type: Sequelize.STRING(100), allowNull: true, unique: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("members", {
      fields: ["status", "is_deleted"],
      name: "idx_members_status_deleted",
    });
    await queryInterface.addIndex("members", {
      fields: ["cell_group_id", "is_deleted"],
      name: "idx_members_cell_group_deleted",
    });
    await queryInterface.addIndex("members", {
      fields: ["group_id", "is_deleted"],
      name: "idx_members_group_deleted",
    });
  },
  down: async (queryInterface) => {
    await queryInterface.removeConstraint("members", "fk_members_deleted_by");
    await queryInterface.dropTable("members");
  },
};
