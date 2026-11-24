"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Account = sequelize.define(
  "Account",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    fund_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    account_type: {
      type: DataTypes.ENUM("cash", "petty_cash", "bank", "gcash", "other"),
      allowNull: false,
      defaultValue: "cash",
    },
    account_number_masked: {
      type: DataTypes.STRING(60),
      allowNull: true,
    },
    opening_balance: {
      type: DataTypes.DECIMAL(14, 2),
      allowNull: false,
      defaultValue: 0,
    },
    is_active: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "accounts",
    timestamps: true,
    underscored: true,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
  },
);

module.exports = Account;
