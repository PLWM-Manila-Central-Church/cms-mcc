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
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName:   "notifications",
    timestamps:  true,
    underscored: true,
    updatedAt:   false,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
    indexes: [
      { fields: ["user_id", "is_read"], name: "idx_notif_user_read" },
      { fields: ["user_id", "createdAt"], name: "idx_notifications_user_created" },
    ],
  },
);

module.exports = Notification;
