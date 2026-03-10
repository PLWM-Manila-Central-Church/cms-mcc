"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EventCategory = sequelize.define(
  "EventCategory",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "event_categories", timestamps: true, underscored: true },
);

module.exports = EventCategory;
