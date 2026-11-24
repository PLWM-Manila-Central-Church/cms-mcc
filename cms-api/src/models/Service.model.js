"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Service = sequelize.define(
  "Service",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    title: { type: DataTypes.STRING(150), allowNull: false },
    service_date: { type: DataTypes.DATEONLY, allowNull: false },
    service_time: { type: DataTypes.TIME, allowNull: true },
    end_time: { type: DataTypes.TIME, allowNull: true },
    venue: { type: DataTypes.STRING(200), allowNull: true },
    presiding_minister: { type: DataTypes.STRING(150), allowNull: true },
    recurrence_rule_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    capacity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    total_parking_slots: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, unique: true },
    gathering_type: {
      type: DataTypes.ENUM(
        "lords_day",
        "wednesday_service",
        "hs_ya_service",
        "bible_seminar",
        "prayer_meeting",
        "other"
      ),
      allowNull: false,
      defaultValue: "lords_day",
    },
    response_deadline: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM("draft", "published", "cancelled", "completed"),
      allowNull: false,
      defaultValue: "draft",
    },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "services", timestamps: true, underscored: true },
);

module.exports = Service;
