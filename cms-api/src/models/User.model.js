"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const User = sequelize.define(
  "User",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    invited_member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    force_password_change: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
    last_login_at:          { type: DataTypes.DATE,    allowNull: true },
    // Fix #7 — account lockout fields
    failed_login_attempts:  { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    locked_until:           { type: DataTypes.DATE,    allowNull: true,  defaultValue: null },
  },
  { tableName: "users", timestamps: true, underscored: true },
);

module.exports = User;
