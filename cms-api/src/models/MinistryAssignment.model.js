"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MinistryAssignment = sequelize.define(
  "MinistryAssignment",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ministry_role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    confirmed: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    substitute_requested: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 0,
    },
  },
  { tableName: "ministry_assignments", timestamps: true, underscored: true },
);

module.exports = MinistryAssignment;
