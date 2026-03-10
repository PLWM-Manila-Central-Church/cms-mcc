"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SystemSetting = sequelize.define(
  "SystemSetting",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    value: { type: DataTypes.TEXT, allowNull: true },
    updated_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "system_settings",
    timestamps: true,
    underscored: true,
    createdAt: false,
  },
);

module.exports = SystemSetting;
