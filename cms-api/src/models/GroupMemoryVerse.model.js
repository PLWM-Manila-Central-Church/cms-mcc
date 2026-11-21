"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const GroupMemoryVerse = sequelize.define(
  "GroupMemoryVerse",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sunday_date: { type: DataTypes.DATEONLY, allowNull: false },
    reference: { type: DataTypes.STRING(120), allowNull: false },
    verse_text: { type: DataTypes.TEXT, allowNull: false },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "group_memory_verses",
    timestamps: true,
    underscored: true,
    indexes: [
      { unique: true, fields: ["group_id", "sunday_date"], name: "uq_gmv_group_sunday" },
    ],
  },
);

module.exports = GroupMemoryVerse;
