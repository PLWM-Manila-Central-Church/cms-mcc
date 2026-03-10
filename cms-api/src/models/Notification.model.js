"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type: { type: DataTypes.STRING(100), allowNull: false },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    read_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "notifications",
    timestamps: true,
    underscored: true,
    updatedAt: false,
  },
);

module.exports = Notification;
