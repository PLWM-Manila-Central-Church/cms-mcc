"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const PaymentMethod = sequelize.define(
  "PaymentMethod",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    method_name: {
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
    tableName: "payment_methods",
    timestamps: true,
    underscored: true,
  },
);

module.exports = PaymentMethod;
