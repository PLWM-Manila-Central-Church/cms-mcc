"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const InventoryUsage = sequelize.define(
  "InventoryUsage",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    item_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    quantity_used: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    used_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    used_for: { type: DataTypes.STRING(255), allowNull: true },
    used_at: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: "inventory_usage", timestamps: false, underscored: true },
);

module.exports = InventoryUsage;
