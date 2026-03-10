"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("inventory_items", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      name: { type: Sequelize.STRING(150), allowNull: false },
      category_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "inventory_categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      quantity: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
      },
      unit: { type: Sequelize.STRING(50), allowNull: true },
      condition: {
        type: Sequelize.ENUM("Good", "Fair", "Poor", "For Disposal"),
        allowNull: true,
      },
      low_stock_threshold: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("inventory_items", {
      fields: ["category_id"],
      name: "idx_inventory_items_category",
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("inventory_items"),
};
