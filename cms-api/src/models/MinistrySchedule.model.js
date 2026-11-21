"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MinistrySchedule = sequelize.define(
  "MinistrySchedule",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    ministry_role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    kind: {
      type: DataTypes.ENUM("practice", "cleaning", "service"),
      allowNull: false,
      defaultValue: "practice",
    },
    title: { type: DataTypes.STRING(150), allowNull: false },
    schedule_date: { type: DataTypes.DATEONLY, allowNull: false },
    start_time: { type: DataTypes.TIME, allowNull: true },
    end_time: { type: DataTypes.TIME, allowNull: true },
    location: { type: DataTypes.STRING(255), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "ministry_schedules",
    timestamps: true,
    underscored: true,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
    indexes: [
      { fields: ["ministry_role_id", "schedule_date"], name: "idx_ms_role_date" },
    ],
  },
);

module.exports = MinistrySchedule;
