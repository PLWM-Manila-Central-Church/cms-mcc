"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");
const { INVENTORY_STATUSES } = require("../helpers/inventoryStatus.helper");

const InventoryItem = sequelize.define(
  "InventoryItem",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(150), allowNull: false },
    category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    quantity: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    unit: { type: DataTypes.STRING(50), allowNull: true },
    condition: {
      type: DataTypes.ENUM("Good", "Fair", "Poor", "For Disposal"),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(...INVENTORY_STATUSES),
      allowNull: false,
      defaultValue: "Available",
    },
    low_stock_threshold: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "inventory_items", timestamps: true, underscored: true },
);

module.exports = InventoryItem;
