"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EventRegistration = sequelize.define(
  "EventRegistration",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    registered_at: { type: DataTypes.DATE, allowNull: false },
    registered_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "event_registrations", timestamps: false, underscored: true },
);

module.exports = EventRegistration;
