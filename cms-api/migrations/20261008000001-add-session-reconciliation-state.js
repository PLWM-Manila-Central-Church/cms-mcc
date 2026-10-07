"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columns = await queryInterface.describeTable("attendance_sessions");
    const additions = {
      config_revision: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      activity_revision: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      capture_closed_at: { type: Sequelize.DATE, allowNull: true },
      finalized_at: { type: Sequelize.DATE, allowNull: true },
      finalized_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      finalized_revision: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
    };

    for (const [name, definition] of Object.entries(additions)) {
      if (!columns[name]) await queryInterface.addColumn("attendance_sessions", name, definition);
    }

    const finalizedByConstraints = await queryInterface.sequelize.query(`
      SELECT CONSTRAINT_NAME
      FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'attendance_sessions'
        AND COLUMN_NAME = 'finalized_by'
        AND REFERENCED_TABLE_NAME = 'users'
    `, { type: queryInterface.sequelize.QueryTypes.SELECT });
    if (!finalizedByConstraints.length) {
      await queryInterface.addConstraint("attendance_sessions", {
        fields: ["finalized_by"],
        type: "foreign key",
        name: "fk_attendance_sessions_finalized_by",
        references: { table: "users", field: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
    }

    const indexes = await queryInterface.showIndex("attendance_sessions");
    if (!indexes.some((index) => index.name === "idx_attendance_sessions_finalized_status")) {
      await queryInterface.addIndex("attendance_sessions", {
        fields: ["finalized_at", "status"],
        name: "idx_attendance_sessions_finalized_status",
      });
    }
  },

  // Reconciliation is audit state; do not erase it during rollback.
  down: async () => {
    throw new Error("Session reconciliation state is forward-only.");
  },
};
