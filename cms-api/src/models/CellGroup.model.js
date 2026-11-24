"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CellGroup = sequelize.define(
  "CellGroup",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    code: { type: DataTypes.STRING(32), allowNull: true },
    area: { type: DataTypes.STRING(100), allowNull: true },
    leader_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    assistant_leader_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    ministry_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    meeting_day: { type: DataTypes.STRING(32), allowNull: true },
    meeting_time: { type: DataTypes.TIME, allowNull: true },
    meeting_location: { type: DataTypes.STRING(200), allowNull: true },
    status: { type: DataTypes.ENUM("active", "inactive", "archived"), allowNull: false, defaultValue: "active" },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "cell_groups", timestamps: true, underscored: true },
);

module.exports = CellGroup;
