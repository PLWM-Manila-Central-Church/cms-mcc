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
    service_time: { type: DataTypes.TIME, allowNull: false },
    capacity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    total_parking_slots: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    response_deadline: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM("draft", "published", "cancelled", "completed"),
      allowNull: false,
      defaultValue: "draft",
    },
  },
  { tableName: "services", timestamps: true, underscored: true },
);

module.exports = Service;
