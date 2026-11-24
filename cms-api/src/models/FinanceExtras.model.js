"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const FinanceTransfer = sequelize.define(
  "FinanceTransfer",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    transaction_number: { type: DataTypes.STRING(40), allowNull: true },
    transfer_date: { type: DataTypes.DATEONLY, allowNull: false },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    from_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    to_account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    from_fund_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    to_fund_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    reference_number: { type: DataTypes.STRING(100), allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  {
    tableName: "finance_transfers",
    timestamps: true,
    underscored: true,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
  }
);

const FinanceApproval = sequelize.define(
  "FinanceApproval",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    entity_type: {
      type: DataTypes.ENUM("expense", "budget", "liquidation", "transfer"),
      allowNull: false,
    },
    entity_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    action: {
      type: DataTypes.ENUM("submitted", "approved", "rejected", "paid", "cancelled"),
      allowNull: false,
    },
    actor_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "finance_approvals",
    timestamps: true,
    updatedAt: false,
    underscored: true,
  }
);

module.exports = { FinanceTransfer, FinanceApproval };
