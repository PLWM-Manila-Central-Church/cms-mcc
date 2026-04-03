"use strict";

const { Op, fn, col, literal } = require("sequelize");
const sequelize = require("../config/db");
const {
  Member, FinancialRecord, FinancialCategory, Service, Event,
  InventoryItem, InventoryRequest, AuditLog, User,
} = require("../models");

exports.getStats = async ({ memberId, roleName } = {}) => {
  const now       = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const isMember  = roleName === "Member";

  // Finance where clause — scoped to member if role is Member
  const financeWhere = { transaction_date: { [Op.gte]: thisMonth } };
  if (isMember && memberId) financeWhere.member_id = memberId;

  // ── Fire all independent queries in parallel ───────────────
  const [
    totalMembers,
    activeMembers,
    newThisMonth,
    totalThisMonth,
    recentRecords,
    totalServices,
    upcomingServices,
    totalEvents,
    upcomingEvents,
    totalItems,
    pendingRequests,
    lowStock,
    recentActivity,
  ] = await Promise.all([
    Member.count(),
    Member.count({ where: { status: "Active" } }),
    Member.count({ where: { created_at: { [Op.gte]: thisMonth } } }),

    FinancialRecord.sum("amount", { where: financeWhere }).then(v => v || 0),

    FinancialRecord.findAll({
      order: [["transaction_date", "DESC"]],
      limit: 5,
      ...(isMember && memberId ? { where: { member_id: memberId } } : {}),
      include: [
        { model: Member,            attributes: ["id", "first_name", "last_name"], required: false },
        { model: FinancialCategory, as: "category", attributes: ["id", "name"],   required: false },
      ],
    }),

    Service.count(),
    Service.count({ where: { service_date: { [Op.gte]: now }, status: "published" } }),

    Event.count(),
    Event.findAll({
      where: { start_date: { [Op.gte]: now }, status: "published" },
      order: [["start_date", "ASC"]],
      limit: 5,
    }),

    InventoryItem.count(),
    InventoryRequest.count({ where: { status: "pending" } }),

    // SQL-side low stock check — no JS filtering, no full table scan
    InventoryItem.count({
      where: sequelize.literal(
        "low_stock_threshold IS NOT NULL AND quantity <= low_stock_threshold"
      ),
    }),

    AuditLog.findAll({
      order: [["created_at", "DESC"]],
      limit: 10,
      include: [{ model: User, attributes: ["id", "email"], required: false }],
    }),
  ]);

  return {
    members:       { total: totalMembers, active: activeMembers, newThisMonth },
    finance:       { totalThisMonth, recentRecords },
    services:      { total: totalServices, upcoming: upcomingServices },
    events:        { total: totalEvents, upcoming: upcomingEvents },
    inventory:     { totalItems, pendingRequests, lowStock },
    recentActivity,
  };
};
