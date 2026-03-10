"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const InventoryCategory = sequelize.define(
  "InventoryCategory",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  },
  { tableName: "inventory_categories", timestamps: true, underscored: true },
);

module.exports = InventoryCategory;
