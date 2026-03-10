"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const AuditLog = sequelize.define(
  "AuditLog",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    action: { type: DataTypes.STRING(100), allowNull: false },
    target_table: { type: DataTypes.STRING(100), allowNull: true },
    target_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    old_values: { type: DataTypes.JSON, allowNull: true },
    new_values: { type: DataTypes.JSON, allowNull: true },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
  },
  {
    tableName: "audit_logs",
    timestamps: true,
    underscored: true,
    updatedAt: false,
    createdAt: "created_at",
  },
);

module.exports = AuditLog;
