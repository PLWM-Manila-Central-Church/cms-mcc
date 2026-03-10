"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MemberStatusHistory = sequelize.define(
  "MemberStatusHistory",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    old_status: {
      type: DataTypes.ENUM("Active", "Inactive", "Visitor"),
      allowNull: false,
    },
    new_status: {
      type: DataTypes.ENUM("Active", "Inactive", "Visitor"),
      allowNull: false,
    },
    changed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "member_status_history",
    timestamps: true,
    underscored: true,
    updatedAt: false,
  },
);

module.exports = MemberStatusHistory;
