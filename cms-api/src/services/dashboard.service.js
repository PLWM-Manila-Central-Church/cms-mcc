"use strict";

const { Op } = require("sequelize");
const {
  Member, FinancialRecord, FinancialCategory, Service, Event,
  InventoryItem, InventoryRequest, AuditLog, User,
} = require("../models");

exports.getStats = async ({ memberId, roleId } = {}) => {
  const now       = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const isMember  = roleId === 7; // role_id 7 = Member

  // ── Members ───────────────────────────────────────────────
  const totalMembers  = await Member.count();
  const activeMembers = await Member.count({ where: { status: "Active" } });

  // FIX BUG 4: was using camelCase `createdAt` which can silently return 0
  // on some Sequelize+MySQL setups. Use the explicit snake_case column name.
  const newThisMonth = await Member.count({
    where: { created_at: { [Op.gte]: thisMonth } },
  });

  // ── Finance ───────────────────────────────────────────────
  const financeWhere = { transaction_date: { [Op.gte]: thisMonth } };
  if (isMember && memberId) financeWhere.member_id = memberId;

  const totalThisMonth = (await FinancialRecord.sum("amount", {
    where: financeWhere,
  })) || 0;

  // FIX BUG 14: was using Member.unscoped() which can cause a Sequelize
  // EagerLoadingError because the stored association reference is plain Member.
  // Using Member directly is correct; required: false handles missing joins safely.
  const recentRecords = await FinancialRecord.findAll({
    order: [["transaction_date", "DESC"]],
    limit: 5,
    ...(isMember && memberId ? { where: { member_id: memberId } } : {}),
    include: [
      { model: Member,            attributes: ["id", "first_name", "last_name"], required: false },
      { model: FinancialCategory, as: "category", attributes: ["id", "name"],   required: false },
    ],
  });

  // ── Services ──────────────────────────────────────────────
  const totalServices    = await Service.count();
  const upcomingServices = await Service.count({
    where: { service_date: { [Op.gte]: now }, status: "published" },
  });

  // ── Events ────────────────────────────────────────────────
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
