"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MinistryGroup = sequelize.define(
  "MinistryGroup",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  },
  { tableName: "ministry_groups", timestamps: true, underscored: true },
);

module.exports = MinistryGroup;
