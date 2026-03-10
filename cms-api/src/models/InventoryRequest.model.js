"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const InventoryRequest = sequelize.define(
  "InventoryRequest",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    item_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    requested_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    purpose: { type: DataTypes.STRING(255), allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    reviewed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "inventory_requests", timestamps: true, underscored: true },
);

module.exports = InventoryRequest;
