"use strict";

const archivedTables = [
  "services",
  "cell_groups",
  "inventory_items",
  "ministry_roles",
  "archive_categories",
  "attachments",
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of archivedTables) {
      await queryInterface.addColumn(table, "is_deleted", {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
      });
      await queryInterface.addColumn(table, "deleted_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      await queryInterface.addColumn(table, "deleted_by", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
      await queryInterface.addIndex(table, {
        fields: ["is_deleted", "deleted_at"],
        name: `idx_${table}_archive_state`,
      });
    }

    await queryInterface.addColumn("users", "deleted_by", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addColumn("users", "archived_email", {
      type: Sequelize.STRING(150),
      allowNull: true,
    });
    await queryInterface.addColumn("users", "archived_is_active", {
      type: Sequelize.TINYINT,
      allowNull: true,
    });
    await queryInterface.addColumn("members", "archived_linked_user_active", {
      type: Sequelize.TINYINT,
      allowNull: true,
    });
    await queryInterface.addColumn("inventory_usage", "is_reversed", {
      type: Sequelize.TINYINT,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("inventory_usage", "reversed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("inventory_usage", "reversed_by", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addIndex("inventory_usage", {
      fields: ["is_reversed", "used_at"],
      name: "idx_inventory_usage_reversed_date",
    });
    await queryInterface.addColumn("event_registrations", "is_deleted", {
      type: Sequelize.TINYINT,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addColumn("event_registrations", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("event_registrations", "deleted_by", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addIndex("event_registrations", {
      fields: ["event_id", "is_deleted", "member_id"],
      name: "idx_event_registrations_active_member",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("members", "archived_linked_user_active");
    await queryInterface.removeIndex("event_registrations", "idx_event_registrations_active_member");
    await queryInterface.removeColumn("event_registrations", "deleted_by");
    await queryInterface.removeColumn("event_registrations", "deleted_at");
    await queryInterface.removeColumn("event_registrations", "is_deleted");
    await queryInterface.removeIndex("inventory_usage", "idx_inventory_usage_reversed_date");
    await queryInterface.removeColumn("inventory_usage", "reversed_by");
    await queryInterface.removeColumn("inventory_usage", "reversed_at");
    await queryInterface.removeColumn("inventory_usage", "is_reversed");
    await queryInterface.removeColumn("users", "archived_is_active");
    await queryInterface.removeColumn("users", "archived_email");
    await queryInterface.removeColumn("users", "deleted_by");

    for (const table of [...archivedTables].reverse()) {
      await queryInterface.removeIndex(table, `idx_${table}_archive_state`);
      await queryInterface.removeColumn(table, "deleted_by");
      await queryInterface.removeColumn(table, "deleted_at");
      await queryInterface.removeColumn(table, "is_deleted");
    }
  },
};
