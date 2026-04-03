"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Notification = sequelize.define(
  "Notification",
  {
    id: {
      type:          DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey:    true,
    },
    user_id:  { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    type:     { type: DataTypes.STRING(100),       allowNull: false },
    message:  { type: DataTypes.TEXT,              allowNull: false },
    // Deep-link columns (added by migration 20260324000002)
    reference_id:   { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    reference_type: { type: DataTypes.STRING(50),        allowNull: true, defaultValue: null },
    is_read: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    read_at: { type: DataTypes.DATE,    allowNull: true },
  },
  {
    tableName:   "notifications",
    timestamps:  true,
    underscored: true,
    updatedAt:   false,
  },
);

module.exports = Notification;
