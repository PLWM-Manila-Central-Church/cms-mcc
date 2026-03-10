"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const FinancialCategory = sequelize.define(
  "FinancialCategory",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  },
  { tableName: "financial_categories", timestamps: true, underscored: true },
);

module.exports = FinancialCategory;
