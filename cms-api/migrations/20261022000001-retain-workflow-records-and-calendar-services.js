"use strict";

const retainedTables = [
  "notifications",
  "emergency_contacts",
  "ministry_assignments",
  "ministry_memberships",
  "attendance_batch_items",
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of retainedTables) {
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

    await queryInterface.changeColumn("services", "service_time", {
      type: Sequelize.TIME,
      allowNull: true,
    });
    await queryInterface.changeColumn("services", "capacity", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.changeColumn("services", "total_parking_slots", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.changeColumn("events", "total_parking_slots", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    });
    await queryInterface.addColumn("services", "event_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: "events", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
    await queryInterface.addIndex("services", {
      fields: ["event_id"],
      unique: true,
      name: "uq_services_linked_event",
    });

    await queryInterface.createTable("event_image_archives", {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      event_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "events", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      image_key: { type: Sequelize.STRING(500), allowNull: true },
      image_url: { type: Sequelize.STRING(1000), allowNull: false },
      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("event_image_archives", {
      fields: ["event_id", "is_deleted", "deleted_at"],
      name: "idx_event_image_archives_state",
    });
  },

  // Forward-only after an event-linked service can have an unknown time or
  // capacity. Restoring NOT NULL would require inventing schedule data.
  down: async () => {
    throw new Error("Workflow retention and calendar-linked service fields are forward-only; preserve the recorded archive state and unknown schedule values.");
  },
};
