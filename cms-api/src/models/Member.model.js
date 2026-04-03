"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Member = sequelize.define(
  "Member",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    email: { type: DataTypes.STRING(150), allowNull: true, unique: true },
    phone: { type: DataTypes.STRING(30), allowNull: true },
    birthdate: { type: DataTypes.DATEONLY, allowNull: true },
    spiritual_birthday: { type: DataTypes.DATEONLY, allowNull: true },
    address: { type: DataTypes.TEXT, allowNull: true },
    gender: {
      type: DataTypes.ENUM("Male", "Female"),
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("New", "Active", "Semi-Active", "Inactive"),
      allowNull: false,
      defaultValue: "Active",
    },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    cell_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    referred_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    profile_photo_url: { type: DataTypes.STRING(255), allowNull: true },
    barcode: { type: DataTypes.STRING(100), allowNull: true, unique: true },
  },
  {
    tableName: "members",
    timestamps: true,
    underscored: true,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
  },
);

module.exports = Member;
