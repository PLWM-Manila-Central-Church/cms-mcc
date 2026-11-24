"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const EventCommittee = sequelize.define(
  "EventCommittee",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    name: { type: DataTypes.STRING(120), allowNull: false },
    chair_member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    responsibilities: { type: DataTypes.TEXT, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "event_committees", timestamps: true, underscored: true }
);

const EventAssignment = sequelize.define(
  "EventAssignment",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    committee_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    role_title: { type: DataTypes.STRING(120), allowNull: false },
    task_notes: { type: DataTypes.TEXT, allowNull: true },
    status: { type: DataTypes.ENUM("assigned", "confirmed", "completed", "cancelled"), allowNull: false, defaultValue: "assigned" },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "event_assignments", timestamps: true, underscored: true }
);

const EventProgramItem = sequelize.define(
  "EventProgramItem",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    start_time: { type: DataTypes.TIME, allowNull: true },
    end_time: { type: DataTypes.TIME, allowNull: true },
    title: { type: DataTypes.STRING(180), allowNull: false },
    lead_person: { type: DataTypes.STRING(120), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "event_program_items", timestamps: true, underscored: true }
);

const EventBudget = sequelize.define(
  "EventBudget",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(160), allowNull: false },
    total_requested: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    total_approved: { type: DataTypes.DECIMAL(14, 2), allowNull: true },
    fund_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    status: { type: DataTypes.ENUM("draft", "submitted", "approved", "rejected", "revised"), allowNull: false, defaultValue: "draft" },
    submitted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    approved_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    approved_at: { type: DataTypes.DATE, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "event_budgets", timestamps: true, underscored: true }
);

const EventBudgetItem = sequelize.define(
  "EventBudgetItem",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    budget_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    category_name: { type: DataTypes.STRING(100), allowNull: false },
    description: { type: DataTypes.STRING(255), allowNull: true },
    quantity: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
    unit_cost: { type: DataTypes.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
    estimated_amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "event_budget_items", timestamps: true, underscored: true }
);

const EventCashAdvance = sequelize.define(
  "EventCashAdvance",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    budget_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    recipient_member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    recipient_name: { type: DataTypes.STRING(150), allowNull: false },
    amount_released: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    release_date: { type: DataTypes.DATEONLY, allowNull: true },
    account_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    fund_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    reference_number: { type: DataTypes.STRING(100), allowNull: true },
    status: { type: DataTypes.ENUM("requested", "approved", "released", "liquidated", "cancelled"), allowNull: false, defaultValue: "requested" },
    released_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    released_at: { type: DataTypes.DATE, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "event_cash_advances", timestamps: true, underscored: true }
);

const EventLiquidation = sequelize.define(
  "EventLiquidation",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    cash_advance_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    total_advanced: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    total_spent: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    amount_returned: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    amount_reimbursed: { type: DataTypes.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.ENUM("draft", "submitted", "verified", "posted", "rejected"), allowNull: false, defaultValue: "draft" },
    submitted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    verified_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    verified_at: { type: DataTypes.DATE, allowNull: true },
    posted_at: { type: DataTypes.DATE, allowNull: true },
    rejection_reason: { type: DataTypes.TEXT, allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "event_liquidations", timestamps: true, underscored: true }
);

const EventLiquidationItem = sequelize.define(
  "EventLiquidationItem",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    liquidation_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    expense_category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    expense_date: { type: DataTypes.DATEONLY, allowNull: false },
    vendor: { type: DataTypes.STRING(150), allowNull: true },
    description: { type: DataTypes.STRING(255), allowNull: false },
    receipt_number: { type: DataTypes.STRING(100), allowNull: true },
    amount: { type: DataTypes.DECIMAL(14, 2), allowNull: false },
    posted_expense_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "event_liquidation_items", timestamps: true, underscored: true }
);

const EventApproval = sequelize.define(
  "EventApproval",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    entity_type: { type: DataTypes.ENUM("event", "budget", "cash_advance", "liquidation"), allowNull: false },
    entity_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    action: { type: DataTypes.STRING(40), allowNull: false },
    actor_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    remarks: { type: DataTypes.TEXT, allowNull: true },
  },
  { tableName: "event_approvals", timestamps: true, updatedAt: false, underscored: true }
);

module.exports = {
  EventCommittee,
  EventAssignment,
  EventProgramItem,
  EventBudget,
  EventBudgetItem,
  EventCashAdvance,
  EventLiquidation,
  EventLiquidationItem,
  EventApproval,
};
