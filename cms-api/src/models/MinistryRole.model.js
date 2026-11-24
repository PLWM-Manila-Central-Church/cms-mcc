"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Organizational Groups & Service Teams (Choir, Ushers, Sound & Media, Broadcast, Church School Teachers, Committees)
// Physical table remains `ministry_roles` for non-destructive compatibility with memberships & schedules.
const MinistryRole = sequelize.define(
  "MinistryRole",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    code: { type: DataTypes.STRING(32), allowNull: true },
    category: {
      type: DataTypes.ENUM("Department", "Service Team", "Committee", "Worship", "Operations", "Teaching", "Other"),
      allowNull: false,
      defaultValue: "Service Team",
    },
    description: { type: DataTypes.TEXT, allowNull: true },
    leader_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    assistant_leader_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    established_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM("Active", "Inactive", "Archived"), allowNull: false, defaultValue: "Active" },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "ministry_roles", timestamps: true, underscored: true },
);

module.exports = MinistryRole;
