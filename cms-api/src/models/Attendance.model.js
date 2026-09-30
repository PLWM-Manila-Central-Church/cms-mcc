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
  {
    tableName: "attendances",
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ["service_id"], name: "idx_attendance_service_id" },
      { fields: ["member_id"], name: "idx_attendance_member_id" },
      { fields: ["service_id", "member_id"], name: "idx_attendance_svc_member" },
      { fields: ["checked_in_at"], name: "idx_attendance_checked_in" },
    ],
  },
);

module.exports = Attendance;
