"use strict";

const selectRows = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, {
  replacements,
  type: queryInterface.sequelize.QueryTypes.SELECT,
});

const hasColumn = async (queryInterface, tableName, columnName) => {
  const rows = await selectRows(queryInterface, `
    SELECT COLUMN_NAME
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND COLUMN_NAME = :columnName
    LIMIT 1
  `, { tableName, columnName });
  return rows.length > 0;
};

const hasIndex = async (queryInterface, tableName, indexName) => {
  const rows = await selectRows(queryInterface, `
    SELECT INDEX_NAME
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = :tableName
      AND INDEX_NAME = :indexName
    LIMIT 1
  `, { tableName, indexName });
  return rows.length > 0;
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!await hasColumn(queryInterface, "events", "total_parking_slots")) {
      await queryInterface.addColumn("events", "total_parking_slots", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      });
    }

    if (!await hasColumn(queryInterface, "event_registrations", "seat_number")) {
      await queryInterface.addColumn("event_registrations", "seat_number", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!await hasColumn(queryInterface, "event_registrations", "parking_slot")) {
      await queryInterface.addColumn("event_registrations", "parking_slot", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!await hasIndex(queryInterface, "event_registrations", "unique_event_registration_seat")) {
      await queryInterface.addIndex("event_registrations", {
        fields: ["event_id", "seat_number"],
        unique: true,
        name: "unique_event_registration_seat",
      });
    }

    if (!await hasIndex(queryInterface, "event_registrations", "unique_event_registration_parking")) {
      await queryInterface.addIndex("event_registrations", {
        fields: ["event_id", "parking_slot"],
        unique: true,
        name: "unique_event_registration_parking",
      });
    }
  },

  down: async () => {
    throw new Error("Event seat and parking reservation data is forward-only; do not remove it in a rollback.");
  },
};
