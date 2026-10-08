"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MinistryApplication = sequelize.define(
  "MinistryApplication",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    application_key: { type: DataTypes.STRING(100), allowNull: true, unique: true },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ministry_role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected", "withdrawn"),
      allowNull: false,
      defaultValue: "pending",
    },
    message: { type: DataTypes.TEXT, allowNull: true },
    review_note: { type: DataTypes.TEXT, allowNull: true },
    reviewed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    reviewed_at: { type: DataTypes.DATE, allowNull: true },
  },
  {
    tableName: "ministry_applications",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["member_id", "status"], name: "idx_ministry_app_member_status" },
      { fields: ["ministry_role_id", "status"], name: "idx_ministry_app_role_status" },
    ],
  },
);

module.exports = MinistryApplication;
