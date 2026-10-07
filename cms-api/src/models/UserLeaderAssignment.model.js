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
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    version: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    revoked_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    revocation_reason: { type: DataTypes.STRING(500), allowNull: true },
  },
  {
    tableName: "user_leader_assignments",
    timestamps: true,
    underscored: true,
  },
);

module.exports = UserLeaderAssignment;
