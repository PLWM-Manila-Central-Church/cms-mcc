"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const RefreshToken = sequelize.define(
  "RefreshToken",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    user_session_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    token: { type: DataTypes.TEXT, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    revoked: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "refresh_tokens",
    timestamps: true,
    underscored: true,
    updatedAt: false,
  },
);

module.exports = RefreshToken;
