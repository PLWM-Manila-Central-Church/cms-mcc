"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const FinancialRecord = sequelize.define(
  "FinancialRecord",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_anonymous: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    receipt_number: { type: DataTypes.STRING(100), allowNull: true },
    amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    payment_method: { type: DataTypes.ENUM("cash", "gcash", "bank_transfer"), allowNull: true },
    transaction_date: { type: DataTypes.DATEONLY, allowNull: false },
    recorded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "financial_records",
    timestamps: true,
    underscored: true,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
    indexes: [
      { fields: ["transaction_date", "is_deleted"], name: "idx_financial_records_date_deleted" },
      { fields: ["member_id", "is_deleted", "transaction_date"], name: "idx_financial_records_member_deleted_date" },
      { fields: ["category_id", "is_deleted"], name: "idx_financial_records_category_deleted" },
      { fields: ["is_deleted", "transaction_date"], name: "idx_finance_date" },
    ],
  },
);

module.exports = FinancialRecord;
