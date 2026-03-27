"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MinistryEventInvite = sequelize.define(
  "MinistryEventInvite",
  {
    id: {
      type:          DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey:    true,
    },
    event_id: {
      type:      DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    ministry_role_id: {
      type:      DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    member_id: {
      type:      DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    invited_by: {
      type:      DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    response_status: {
      type:         DataTypes.ENUM("pending", "attending", "not_attending"),
      allowNull:    false,
      defaultValue: "pending",
    },
    response_deadline: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
    responded_at: {
      type:      DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName:   "ministry_event_invites",
    timestamps:  true,
    underscored: true,
    updatedAt:   false,
  },
);

module.exports = MinistryEventInvite;
