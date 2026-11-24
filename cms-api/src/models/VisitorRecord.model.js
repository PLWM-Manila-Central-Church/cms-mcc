"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const VisitorRecord = sequelize.define(
  "VisitorRecord",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    full_name: { type: DataTypes.STRING(150), allowNull: false },
    phone: { type: DataTypes.STRING(40), allowNull: true },
    email: { type: DataTypes.STRING(150), allowNull: true },
    visit_type: {
      type: DataTypes.ENUM("first_time", "returning"),
      allowNull: false,
      defaultValue: "first_time",
    },
    visit_date: { type: DataTypes.DATEONLY, allowNull: false },
    invited_by_member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    follow_up_status: {
      type: DataTypes.ENUM("pending", "contacted", "integrated"),
      allowNull: false,
      defaultValue: "pending",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    recorded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "visitor_records", timestamps: true, underscored: true }
);

module.exports = VisitorRecord;
