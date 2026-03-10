"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ArchiveCategory = sequelize.define(
  "ArchiveCategory",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    description: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "archive_categories", timestamps: true, underscored: true },
);

module.exports = ArchiveCategory;
