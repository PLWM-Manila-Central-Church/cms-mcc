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
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
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
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
    validate: {
      hasExactlyOneFinancialOwner() {
        const hasIncome = this.income_id !== null && this.income_id !== undefined;
        const hasExpense = this.expense_id !== null && this.expense_id !== undefined;
        if (hasIncome === hasExpense) {
          throw new Error("An attachment must belong to exactly one income or expense record");
        }
      },
    },
  },
);

module.exports = Attachment;
