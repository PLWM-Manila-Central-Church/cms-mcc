"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const SubstituteRequest = sequelize.define(
  "SubstituteRequest",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    assignment_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    requested_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    proposed_substitute: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    resolved_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "substitute_requests", timestamps: true, underscored: true },
);

module.exports = SubstituteRequest;
