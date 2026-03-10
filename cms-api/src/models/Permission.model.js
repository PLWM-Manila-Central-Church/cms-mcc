"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Permission = sequelize.define(
  "Permission",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    module: { type: DataTypes.STRING(100), allowNull: false },
    action: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
  },
  { tableName: "permissions", timestamps: true, underscored: true },
);

module.exports = Permission;
