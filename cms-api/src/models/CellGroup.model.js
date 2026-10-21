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
    area: { type: DataTypes.STRING(100), allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "cell_groups", timestamps: true, underscored: true },
);

module.exports = CellGroup;
