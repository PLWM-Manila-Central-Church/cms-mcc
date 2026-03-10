"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CellGroupHistory = sequelize.define(
  "CellGroupHistory",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    old_cell_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    new_cell_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    changed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    reason: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "cell_group_history",
    timestamps: true,
    underscored: true,
    updatedAt: false,
  },
);

module.exports = CellGroupHistory;
