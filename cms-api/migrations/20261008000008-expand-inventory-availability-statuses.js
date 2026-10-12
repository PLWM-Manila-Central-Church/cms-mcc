"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columns = await queryInterface.describeTable("inventory_items");
    if (!columns.status) {
      await queryInterface.addColumn("inventory_items", "status", {
        type: Sequelize.ENUM("Available", "Low Stock", "Out of Stock", "Under Repair"),
        allowNull: false,
        defaultValue: "Available",
      });
    } else {
      await queryInterface.changeColumn("inventory_items", "status", {
        type: Sequelize.ENUM("Available", "Low Stock", "Out of Stock", "Under Repair"),
        allowNull: false,
        defaultValue: "Available",
      });
    }

    await queryInterface.sequelize.query(`
      UPDATE inventory_items
      SET status = CASE
        WHEN status = 'Under Repair' THEN 'Under Repair'
        WHEN quantity <= 0 THEN 'Out of Stock'
        WHEN low_stock_threshold IS NOT NULL AND quantity <= low_stock_threshold THEN 'Low Stock'
        ELSE 'Available'
      END
    `);

  },

  async down() {
    throw new Error("Inventory availability states are derived from quantity history; use a forward migration to change them.");
  },
};
