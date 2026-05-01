"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MinistryPosition = sequelize.define(
  "MinistryPosition",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    ministry_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_active: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
  },
  {
    tableName: "ministry_positions",
    timestamps: true,
    underscored: true,
  },
);

module.exports = MinistryPosition;
