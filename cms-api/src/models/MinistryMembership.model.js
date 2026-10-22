"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MinistryMembership = sequelize.define(
  "MinistryMembership",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    ministry_role_id: {
      type:      DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    member_id: {
      type:      DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    added_by: {
      type:      DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName:  "ministry_memberships",
    timestamps: true,
    underscored: true,
    updatedAt:  false,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
    indexes: [
      { fields: ["ministry_role_id"], name: "idx_mm_ministry_role" },
    ],
  },
);

module.exports = MinistryMembership;
