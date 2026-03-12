"use strict";

const { Op } = require("sequelize");
const {
  Member, FinancialRecord, FinancialCategory, Service, Event,
  InventoryItem, InventoryRequest, AuditLog, User,
} = require("../models");

exports.getStats = async () => {
  const now       = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // ── Members ───────────────────────────────────────────────
  // Member has defaultScope { where: { is_deleted: 0 } } — never repeat it.
  // Timestamp auto-attrs are camelCase in JS when underscored:true → use `createdAt`
  const totalMembers  = await Member.count();
  const activeMembers = await Member.count({ where: { status: "Active" } });
  const newThisMonth  = await Member.count({
    where: { createdAt: { [Op.gte]: thisMonth } },
  });

  // ── Finance ───────────────────────────────────────────────
  // FinancialRecord has defaultScope { where: { is_deleted: 0 } } — never repeat it.
  // `transaction_date` is explicitly defined on the model so the attribute IS snake_case.
  const totalThisMonth = (await FinancialRecord.sum("amount", {
    where: { transaction_date: { [Op.gte]: thisMonth } },
  })) || 0;

  const recentRecords = await FinancialRecord.findAll({
    order: [["transaction_date", "DESC"]],
    limit: 5,
    subQuery: false,
    include: [
      { model: Member,           attributes: ["id", "first_name", "last_name"], required: false },
      { model: FinancialCategory, as: "category", attributes: ["id", "name"],  required: false },
    ],
  });

  // ── Services ──────────────────────────────────────────────
  // Service has NO is_deleted column and NO defaultScope — plain queries are safe.
  const totalServices    = await Service.count();
  const upcomingServices = await Service.count({
    where: { service_date: { [Op.gte]: now }, status: "published" },
  });

  // ── Events ────────────────────────────────────────────────
  // Event has defaultScope { where: { is_deleted: 0 } } — never repeat it.
  const totalEvents    = await Event.count();
  const upcomingEvents = await Event.findAll({
    where: { start_date: { [Op.gte]: now }, status: "published" },
    order: [["start_date", "ASC"]],
    limit: 5,
  });

  // ── Inventory ─────────────────────────────────────────────
  const totalItems      = await InventoryItem.count();
  const pendingRequests = await InventoryRequest.count({ where: { status: "pending" } });
  const lowStockItems   = await InventoryItem.findAll({
    where: { low_stock_threshold: { [Op.ne]: null } },
  });
  const lowStock = lowStockItems.filter((i) => i.quantity <= i.low_stock_threshold).length;

  // ── Recent Activity ───────────────────────────────────────
  // AuditLog → User association has no alias, include directly with model: User
  const recentActivity = await AuditLog.findAll({
    order: [["created_at", "DESC"]],
    limit: 10,
    include: [{ model: User, attributes: ["id", "email"], required: false }],
  });

  return {
    members:       { total: totalMembers, active: activeMembers, newThisMonth },
    finance:       { totalThisMonth, recentRecords },
    services:      { total: totalServices, upcoming: upcomingServices },
    events:        { total: totalEvents, upcoming: upcomingEvents },
    inventory:     { totalItems, pendingRequests, lowStock },
    recentActivity,
  };
};