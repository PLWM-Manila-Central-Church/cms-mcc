"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Expense = sequelize.define(
  "Expense",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    account_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    fund_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
    },
    transaction_number: {
      type: DataTypes.STRING(40),
      allowNull: true,
    },
    category_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
    },
    payee: {
      type: DataTypes.STRING(160),
      allowNull: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    payment_method_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    requested_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    approved_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    paid_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    paid_at: { type: DataTypes.DATE, allowNull: true },
    payment_reference: { type: DataTypes.STRING(120), allowNull: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    ministry_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    liquidation_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: {
      type: DataTypes.ENUM("draft", "pending_approval", "approved", "rejected", "paid", "cancelled"),
      allowNull: false,
      defaultValue: "paid",
    },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: false,
    },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "expenses",
    timestamps: true,
    underscored: true,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
  },
);

module.exports = Expense;
