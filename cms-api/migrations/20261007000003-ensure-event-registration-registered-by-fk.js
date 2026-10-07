"use strict";

const selectRows = (queryInterface, sql, replacements) => queryInterface.sequelize.query(sql, {
  ...(replacements ? { replacements } : {}),
  type: queryInterface.sequelize.QueryTypes.SELECT,
});

const hasRegisteredByColumn = async (queryInterface) => {
  const rows = await selectRows(
    queryInterface,
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_registrations' AND COLUMN_NAME = 'registered_by' LIMIT 1",
  );
  return rows.length > 0;
};

const hasRegisteredByForeignKey = async (queryInterface) => {
  const rows = await selectRows(
    queryInterface,
    "SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_registrations' AND COLUMN_NAME = 'registered_by' AND REFERENCED_TABLE_NAME = 'users' AND REFERENCED_COLUMN_NAME = 'id' LIMIT 1",
  );
  return rows.length > 0;
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    if (!await hasRegisteredByColumn(queryInterface)) {
      await queryInterface.addColumn("event_registrations", "registered_by", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!await hasRegisteredByForeignKey(queryInterface)) {
      await queryInterface.addConstraint("event_registrations", {
        fields: ["registered_by"],
        type: "foreign key",
        name: "fk_event_registrations_registered_by",
        references: { table: "users", field: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }
  },

  down: async () => {
    throw new Error("This event-registration compatibility repair is forward-only.");
  },
};
