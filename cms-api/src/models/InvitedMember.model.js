"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const InvitedMember = sequelize.define(
  "InvitedMember",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    email: { type: DataTypes.STRING(150), allowNull: false, unique: true },
    first_name: { type: DataTypes.STRING(100), allowNull: false },
    last_name: { type: DataTypes.STRING(100), allowNull: false },
    invite_token: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    invited_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    accepted_at: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "accepted", "expired"),
      allowNull: false,
      defaultValue: "pending",
    },
  },
  {
    tableName: "invited_members",
    timestamps: true,
    underscored: true,
    updatedAt: false,
  },
);

module.exports = InvitedMember;
