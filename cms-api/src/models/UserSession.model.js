"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UserSession = sequelize.define(
  "UserSession",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ip_address: { type: DataTypes.STRING(45), allowNull: true },
    device: { type: DataTypes.STRING(255), allowNull: true },
    login_at: { type: DataTypes.DATE, allowNull: false },
    logout_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "user_sessions", timestamps: false, underscored: true },
);

module.exports = UserSession;
