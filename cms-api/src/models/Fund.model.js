"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Fund = sequelize.define(
  "Fund",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "funds",
    timestamps: true,
    underscored: true,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
  },
);

module.exports = Fund;
