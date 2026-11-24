"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

// Life-Stage Ministries (High School, Young Adults, Men's, Women's, Elementary, Preschool, Toddlers)
// Physical table remains `ministry_groups` for non-destructive compatibility with members.group_id.
const MinistryGroup = sequelize.define(
  "MinistryGroup",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    code: { type: DataTypes.STRING(32), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    leader_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    assistant_leader_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    age_min: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    age_max: { type: DataTypes.TINYINT.UNSIGNED, allowNull: true },
    status: { type: DataTypes.ENUM("Active", "Inactive", "Archived"), allowNull: false, defaultValue: "Active" },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "ministry_groups", timestamps: true, underscored: true },
);

module.exports = MinistryGroup;
