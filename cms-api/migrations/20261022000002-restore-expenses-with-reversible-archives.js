"use strict";

const tables = ["funds", "accounts", "expense_categories", "expenses"];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of tables) {
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
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      });
      await queryInterface.addIndex(table, {
        fields: ["is_deleted", "deleted_at"],
        name: `idx_${table}_archive_state`,
      });
    }
  },

  down: async () => {
    throw new Error("Finance archive state is forward-only; keep archived transaction history and restore it through System Archives.");
  },
};
