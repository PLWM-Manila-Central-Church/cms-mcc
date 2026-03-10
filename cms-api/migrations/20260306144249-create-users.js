"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      role_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "roles", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      invited_member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "invited_members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      email: { type: Sequelize.STRING(150), allowNull: false, unique: true },
      password_hash: { type: Sequelize.STRING(255), allowNull: false },
      is_active: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 },
      force_password_change: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 1,
      },
      last_login_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("users", {
      fields: ["is_active"],
      name: "idx_users_is_active",
    });

    // Add invited_by FK on invited_members now that users table exists
    await queryInterface.addConstraint("invited_members", {
      fields: ["invited_by"],
      type: "foreign key",
      name: "fk_im_invited_by",
      references: { table: "users", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });

    // Add deleted_by FK on members now that users table exists
    await queryInterface.addConstraint("members", {
      fields: ["deleted_by"],
      type: "foreign key",
      name: "fk_members_deleted_by",
      references: { table: "users", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeConstraint(
      "invited_members",
      "fk_im_invited_by",
    );
    await queryInterface.removeConstraint("members", "fk_members_deleted_by");
    await queryInterface.dropTable("users");
  },
};
