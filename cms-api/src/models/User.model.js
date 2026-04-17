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
    leads_cell_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    leads_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    leads_ministry_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    force_password_change: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "users", timestamps: true, underscored: true },
);

module.exports = User;
