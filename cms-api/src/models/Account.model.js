"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Account = sequelize.define(
  "Account",
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
    fund_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    tableName: "accounts",
    timestamps: true,
    underscored: true,
  },
);

module.exports = Account;
