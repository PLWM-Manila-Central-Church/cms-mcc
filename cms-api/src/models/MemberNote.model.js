"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MemberNote = sequelize.define(
  "MemberNote",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    note: { type: DataTypes.TEXT, allowNull: false },
    is_confidential: {
      type: DataTypes.TINYINT,
      allowNull: false,
      defaultValue: 1,
    },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "member_notes", timestamps: true, underscored: true },
);

module.exports = MemberNote;
