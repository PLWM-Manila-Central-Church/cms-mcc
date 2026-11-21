"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const BibleReadingProgress = sequelize.define(
  "BibleReadingProgress",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reading_date: { type: DataTypes.DATEONLY, allowNull: false },
    completed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  },
  {
    tableName: "bible_reading_progress",
    timestamps: false,
    underscored: true,
    indexes: [
      { unique: true, fields: ["member_id", "reading_date"], name: "uq_brp_member_date" },
      { fields: ["reading_date"], name: "idx_brp_date" },
    ],
  },
);

module.exports = BibleReadingProgress;
