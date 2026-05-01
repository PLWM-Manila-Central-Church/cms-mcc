"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UserLeaderAssignment = sequelize.define(
  "UserLeaderAssignment",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    scope_type: {
      type: DataTypes.ENUM("ministry", "cell_group", "member_group"),
      allowNull: false,
    },
    scope_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    legacy_column: {
      type: DataTypes.STRING(64),
      allowNull: true,
    },
    assigned_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
  },
  {
    tableName: "user_leader_assignments",
    timestamps: true,
    underscored: true,
  },
);

module.exports = UserLeaderAssignment;
