"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Attendance = sequelize.define(
  "Attendance",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    check_in_method: {
      type: DataTypes.ENUM("barcode", "manual", "pre-reg"),
      allowNull: false,
    },
    checked_in_at: { type: DataTypes.DATE, allowNull: false },
    recorded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "attendances", timestamps: false, underscored: true },
);

module.exports = Attendance;
