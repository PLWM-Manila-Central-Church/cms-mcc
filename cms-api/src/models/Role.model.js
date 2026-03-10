"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Role = sequelize.define(
  "Role",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    role_name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
    description: { type: DataTypes.STRING(255), allowNull: true },
    is_system: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "roles", timestamps: true, underscored: true },
);

module.exports = Role;
