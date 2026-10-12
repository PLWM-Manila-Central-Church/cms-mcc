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
    seat_number: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    parking_slot: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "event_registrations",
    timestamps: false,
    underscored: true,
    indexes: [
      { fields: ["event_id", "member_id"], unique: true, name: "unique_event_member_registration" },
      { fields: ["event_id", "seat_number"], unique: true, name: "unique_event_registration_seat" },
      { fields: ["event_id", "parking_slot"], unique: true, name: "unique_event_registration_parking" },
    ],
  },
);

module.exports = EventRegistration;
