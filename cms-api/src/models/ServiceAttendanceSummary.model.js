"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ServiceAttendanceSummary = sequelize.define(
  "ServiceAttendanceSummary",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    total_expected: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    total_attended: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
    total_absent: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    tableName: "service_attendance_summary",
    timestamps: true,
    underscored: true,
    createdAt: false,
  },
);

module.exports = ServiceAttendanceSummary;
