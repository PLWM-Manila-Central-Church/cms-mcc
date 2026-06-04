"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Attachment = sequelize.define(
  "Attachment",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    income_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    expense_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    file_name: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    file_path: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },
    uploaded_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    uploaded_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "attachments",
    timestamps: false,
    underscored: true,
  },
);

module.exports = Attachment;
