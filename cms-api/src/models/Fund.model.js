"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Fund = sequelize.define(
  "Fund",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "funds",
    timestamps: true,
    underscored: true,
  },
);

module.exports = Fund;
