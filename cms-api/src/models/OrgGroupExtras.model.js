"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const GroupPosition = sequelize.define(
  "GroupPosition",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    responsibilities: { type: DataTypes.TEXT, allowNull: true },
    sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "group_positions", timestamps: true, underscored: true },
);

const GroupMemberPosition = sequelize.define(
  "GroupMemberPosition",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    position_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    assigned_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    assigned_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "group_member_positions", timestamps: true, underscored: true },
);

const GroupActivity = sequelize.define(
  "GroupActivity",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(180), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    activity_date: { type: DataTypes.DATEONLY, allowNull: true },
    start_time: { type: DataTypes.TIME, allowNull: true },
    location: { type: DataTypes.STRING(200), allowNull: true },
    status: { type: DataTypes.ENUM("planned", "ongoing", "completed", "cancelled"), allowNull: false, defaultValue: "planned" },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "group_activities", timestamps: true, underscored: true },
);

const GroupTask = sequelize.define(
  "GroupTask",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    activity_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    title: { type: DataTypes.STRING(200), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    assigned_member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    due_date: { type: DataTypes.DATEONLY, allowNull: true },
    status: { type: DataTypes.ENUM("pending", "in_progress", "completed", "cancelled"), allowNull: false, defaultValue: "pending" },
    completed_at: { type: DataTypes.DATE, allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "group_tasks", timestamps: true, underscored: true },
);

module.exports = { GroupPosition, GroupMemberPosition, GroupActivity, GroupTask };
