"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ArchiveVersion = sequelize.define(
  "ArchiveVersion",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    record_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    file_url: { type: DataTypes.STRING(500), allowNull: false },
    // The live TiDB column is VARCHAR(50); the parent archive record and upload
    // filter keep the set of supported file types constrained at the API edge.
    file_type: { type: DataTypes.STRING(50), allowNull: false },
    file_size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    version_number: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    uploaded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "archive_versions",
    timestamps: true,
    underscored: true,
    updatedAt: false,
  },
);

module.exports = ArchiveVersion;
