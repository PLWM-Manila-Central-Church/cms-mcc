"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Group = sequelize.define(
  "Group",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  },
  { tableName: "groups", timestamps: true, underscored: true },
);

module.exports = Group;
