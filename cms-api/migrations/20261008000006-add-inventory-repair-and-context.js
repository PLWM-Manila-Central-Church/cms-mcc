"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const items = await queryInterface.describeTable("inventory_items");
    if (!items.status) {
      await queryInterface.addColumn("inventory_items", "status", {
        type: Sequelize.ENUM("Available", "Under Repair"),
        allowNull: false,
        defaultValue: "Available",
      });
    }

    const requests = await queryInterface.describeTable("inventory_requests");
    const contextColumns = [
      ["event_id", "events"],
      ["service_id", "services"],
      ["ministry_role_id", "ministry_roles"],
    ];
    for (const [column, table] of contextColumns) {
      if (!requests[column]) {
        await queryInterface.addColumn("inventory_requests", column, {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: table, key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        });
      }
      const indexes = await queryInterface.showIndex("inventory_requests");
      if (!indexes.some((index) => index.name === `idx_inventory_request_${column}`)) {
        await queryInterface.addIndex("inventory_requests", [column], {
          name: `idx_inventory_request_${column}`,
        });
      }
    }
  },

  async down() {
    throw new Error("Inventory repair states and request context are retained as audit history; use a forward migration to change them.");
  },
};
