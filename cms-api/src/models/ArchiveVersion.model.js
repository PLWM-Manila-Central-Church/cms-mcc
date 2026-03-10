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
    file_type: {
      type: DataTypes.ENUM("pdf", "docx", "xlsx", "jpg", "png", "mp4", "mp3"),
      allowNull: false,
    },
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
