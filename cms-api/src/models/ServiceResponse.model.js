"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ServiceResponse = sequelize.define(
  "ServiceResponse",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    attendance_status: {
      type: DataTypes.ENUM("ATTENDING", "NOT_ATTENDING", "UNDECIDED"),
      allowNull: false,
    },
    seat_number: { type: DataTypes.STRING(10), allowNull: true },
    parking_slot: { type: DataTypes.STRING(10), allowNull: true },
    override_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    override_reason: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "service_responses", timestamps: true, underscored: true },
);

module.exports = ServiceResponse;
