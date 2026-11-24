"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Fund = sequelize.define(
  "Fund",
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
    fund_code: {
      type: DataTypes.STRING(32),
      allowNull: true,
    },
    is_restricted: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
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
    tableName: "funds",
    timestamps: true,
    underscored: true,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
  },
);

module.exports = Fund;
