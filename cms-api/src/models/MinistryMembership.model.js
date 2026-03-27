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
  },
  {
    tableName:  "ministry_memberships",
    timestamps: true,
    underscored: true,
    updatedAt:  false,
  },
);

module.exports = MinistryMembership;
