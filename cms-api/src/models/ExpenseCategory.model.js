"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ExpenseCategory = sequelize.define(
  "ExpenseCategory",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    account_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    category_name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "expense_categories",
    timestamps: true,
    underscored: true,
  },
);

module.exports = ExpenseCategory;
