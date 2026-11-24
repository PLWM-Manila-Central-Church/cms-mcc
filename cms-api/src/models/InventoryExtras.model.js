"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const InventoryBorrowing = sequelize.define(
  "InventoryBorrowing",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    item_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    borrower_member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    borrower_name: { type: DataTypes.STRING(150), allowNull: false },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    ministry_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
    quantity_returned: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    borrowed_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    due_return_date: { type: DataTypes.DATEONLY, allowNull: true },
    returned_at: { type: DataTypes.DATE, allowNull: true },
    return_condition: { type: DataTypes.ENUM("Good", "Fair", "Poor", "Damaged", "Lost"), allowNull: true },
    status: {
      type: DataTypes.ENUM("requested", "approved", "borrowed", "partially_returned", "returned", "overdue", "damaged", "lost"),
      allowNull: false,
      defaultValue: "borrowed",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    recorded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "inventory_borrowings", timestamps: true, underscored: true }
);

const InventoryMaintenance = sequelize.define(
  "InventoryMaintenance",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    item_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    maintenance_date: { type: DataTypes.DATEONLY, allowNull: false },
    maintenance_type: {
      type: DataTypes.ENUM("inspection", "repair", "servicing", "calibration", "disposal"),
      allowNull: false,
      defaultValue: "repair",
    },
    vendor: { type: DataTypes.STRING(150), allowNull: true },
    cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    finance_expense_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: {
      type: DataTypes.ENUM("scheduled", "in_progress", "completed", "cancelled"),
      allowNull: false,
      defaultValue: "scheduled",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    next_due_date: { type: DataTypes.DATEONLY, allowNull: true },
    recorded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "inventory_maintenance", timestamps: true, underscored: true }
);

module.exports = { InventoryBorrowing, InventoryMaintenance };
