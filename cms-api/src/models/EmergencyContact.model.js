"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EmergencyContact = sequelize.define(
  "EmergencyContact",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    relationship: { type: DataTypes.STRING(50), allowNull: false },
    phone: { type: DataTypes.STRING(30), allowNull: false },
  },
  { tableName: "emergency_contacts", timestamps: true, underscored: true },
);

module.exports = EmergencyContact;
