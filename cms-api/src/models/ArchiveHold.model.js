"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ArchiveHold = sequelize.define(
  "ArchiveHold",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    entity_type: { type: DataTypes.STRING(64), allowNull: false },
    entity_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    reason: { type: DataTypes.STRING(255), allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "archive_holds",
    timestamps: true,
    underscored: true,
    updatedAt: false,
    indexes: [{ unique: true, fields: ["entity_type", "entity_id"], name: "uq_archive_hold" }],
  },
);

module.exports = ArchiveHold;
