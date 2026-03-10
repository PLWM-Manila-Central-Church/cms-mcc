"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const RolePermission = sequelize.define(
  "RolePermission",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    permission_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  {
    tableName: "role_permissions",
    timestamps: true,
    underscored: true,
    updatedAt: false,
  },
);

module.exports = RolePermission;
