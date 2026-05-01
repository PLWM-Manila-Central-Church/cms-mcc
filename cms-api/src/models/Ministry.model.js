"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Ministry = sequelize.define(
  "Ministry",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    legacy_ministry_role_id: {
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
    tableName: "ministries",
    timestamps: true,
    underscored: true,
  },
);

module.exports = Ministry;
