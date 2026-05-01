"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const InventoryTransaction = sequelize.define(
  "InventoryTransaction",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    item_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    transaction_type: {
      type: DataTypes.ENUM(
        "initial",
        "adjustment",
        "usage",
        "request_fulfillment",
        "return",
      ),
      allowNull: false,
    },
    quantity_delta: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    source_type: {
      type: DataTypes.STRING(80),
      allowNull: true,
    },
    source_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    recorded_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    occurred_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "inventory_transactions",
    timestamps: true,
    underscored: true,
  },
);

module.exports = InventoryTransaction;
