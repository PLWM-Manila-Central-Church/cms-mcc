"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ArchiveAccessLog = sequelize.define(
  "ArchiveAccessLog",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    record_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    accessed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    action: { type: DataTypes.ENUM("view", "download"), allowNull: false },
    accessed_at: { type: DataTypes.DATE, allowNull: false },
  },
  { tableName: "archive_access_logs", timestamps: false, underscored: true },
);

module.exports = ArchiveAccessLog;
