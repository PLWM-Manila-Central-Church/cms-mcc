"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const ArchiveRecord = sequelize.define(
  "ArchiveRecord",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(255), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    file_url: { type: DataTypes.STRING(500), allowNull: false },
    file_type: {
      type: DataTypes.ENUM("pdf", "docx", "xlsx", "jpg", "png", "mp4", "mp3"),
      allowNull: false,
    },
    file_size: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    document_date: { type: DataTypes.DATEONLY, allowNull: true },
    visibility: {
      type: DataTypes.ENUM("public", "restricted", "confidential"),
      allowNull: false,
      defaultValue: "public",
    },
    status: {
      type: DataTypes.ENUM("pending", "approved", "deleted"),
      allowNull: false,
      defaultValue: "pending",
    },
    uploaded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    approved_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "archive_records",
    timestamps: true,
    underscored: true,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
  },
);

module.exports = ArchiveRecord;
