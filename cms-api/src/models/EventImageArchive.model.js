"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EventImageArchive = sequelize.define("EventImageArchive", {
  id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
  event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  image_key: { type: DataTypes.STRING(500), allowNull: true },
  image_url: { type: DataTypes.STRING(1000), allowNull: false },
  created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
  deleted_at: { type: DataTypes.DATE, allowNull: true },
  deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
}, {
  tableName: "event_image_archives",
  timestamps: true,
  underscored: true,
  defaultScope: { where: { is_deleted: 0 } },
  scopes: { withDeleted: {} },
});

module.exports = EventImageArchive;
