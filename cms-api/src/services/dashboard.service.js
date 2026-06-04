"use strict";

const { Op, fn, col, literal } = require("sequelize");
const sequelize = require("../config/db");
const cache = require("../helpers/cache.helper");
const {
  Member, FinancialRecord, FinancialCategory, Service, Event,
  InventoryItem, InventoryRequest, AuditLog, User,
  ArchiveRecord, InvitedMember, MinistryMembership, MinistryEventInvite,
} = require("../models");

const dateOnly = (date) => date.toISOString().slice(0, 10);

const youngAdultCandidateWhere = () => {
  const today = new Date();
  const maxBirthdate = new Date(today);
  maxBirthdate.setFullYear(maxBirthdate.getFullYear() - 18);
  const minBirthdate = new Date(today);
  minBirthdate.setFullYear(minBirthdate.getFullYear() - 30);

  return {
    group_id: null,
    birthdate: {
      [Op.gt]: dateOnly(minBirthdate),
      [Op.lte]: dateOnly(maxBirthdate),
    },
  };
};

const getRoleSummary = async ({
  userId,
  roleName,
  leadsMinistryId,
  leadsMinistryName,
  leadsCellGroupId,
  leadsCellGroupName,
  leadsGroupId,
  leadsGroupName,
  thisMonth,
}) => {
  switch (roleName) {
    case "System Admin": {
      const [activeUsers, pendingArchives] = await Promise.all([
        User.count({ where: { is_active: 1, is_deleted: 0 } }),
        ArchiveRecord.count({ where: { status: "pending" } }),
      ]);
      return { scopeName: "All systems", activeUsers, pendingArchives };
    }
    case "Pastor": {
      const [pendingArchives, upcomingServices] = await Promise.all([
        ArchiveRecord.count({ where: { status: "pending" } }),
        Service.count({ where: { service_date: { [Op.gte]: new Date() }, status: "published" } }),
      ]);
      return { scopeName: "Church overview", pendingArchives, upcomingServices };
    }
    case "Registration Team": {
      const [pendingInvites, newMembers] = await Promise.all([
        InvitedMember.count({ where: { status: "pending" } }),
        Member.count({ where: { created_at: { [Op.gte]: thisMonth } } }),
      ]);
      return { scopeName: "Member operations", pendingInvites, newMembers };
    }
    case "Finance Team": {
      const [recordsThisMonth, pendingArchives] = await Promise.all([
        FinancialRecord.count({ where: { transaction_date: { [Op.gte]: thisMonth } } }),
        ArchiveRecord.count({ where: { status: "pending", visibility: { [Op.in]: ["public", "restricted"] } } }),
      ]);
      return { scopeName: "Finance operations", recordsThisMonth, pendingArchives };
    }
    case "Ministry Leader": {
      const [membersInScope, pendingInvites, pendingRequests] = await Promise.all([
        leadsMinistryId ? MinistryMembership.count({ where: { ministry_role_id: leadsMinistryId } }) : 0,
        leadsMinistryId ? MinistryEventInvite.count({ where: { ministry_role_id: leadsMinistryId, response_status: "pending" } }) : 0,
        userId ? InventoryRequest.count({ where: { requested_by: userId, status: "pending" } }) : 0,
      ]);
      return { scopeName: leadsMinistryName || "Assigned ministry", membersInScope, pendingInvites, pendingRequests };
    }
    case "Cell Group Leader": {
      const [membersInScope, pendingRequests] = await Promise.all([
        leadsCellGroupId ? Member.count({ where: { cell_group_id: leadsCellGroupId } }) : 0,
        userId ? InventoryRequest.count({ where: { requested_by: userId, status: "pending" } }) : 0,
      ]);
      return { scopeName: leadsCellGroupName || "Assigned cell group", membersInScope, pendingRequests };
    }
    case "Group Leader": {
      const isYoungAdults = /young adults|ya/i.test(leadsGroupName || "");
      const [membersInScope, eligibleCandidates, pendingRequests] = await Promise.all([
        leadsGroupId ? Member.count({ where: { group_id: leadsGroupId } }) : 0,
        isYoungAdults ? Member.count({ where: youngAdultCandidateWhere() }) : Member.count({ where: { group_id: null } }),
        userId ? InventoryRequest.count({ where: { requested_by: userId, status: "pending" } }) : 0,
      ]);
      return { scopeName: leadsGroupName || "Assigned group", membersInScope, eligibleCandidates, pendingRequests };
    }
    default:
      return { scopeName: roleName || "Dashboard" };
  }
};

exports.getStats = async ({
  userId, memberId, roleName, leadsMinistryId, leadsMinistryName,
  leadsCellGroupId, leadsCellGroupName, leadsGroupId, leadsGroupName,
} = {}) => {
  const now       = new Date();
  const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const isMember  = roleName === "Member";

  // Cache key includes role and scope — members get a unique key per memberId
  const cacheKey = isMember
    ? `dashboard:member:${memberId}`
    : `dashboard:${roleName}:${leadsMinistryId || ""}:${leadsCellGroupId || ""}:${leadsGroupId || ""}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const financeWhere = { transaction_date: { [Op.gte]: thisMonth } };
  if (isMember && memberId) financeWhere.member_id = memberId;

  // Build member-appropriate aggregates: Members see scoped data, roles see global
  const memberCounts = isMember
    ? { total: 0, active: 0, newThisMonth: 0 }
    : await Promise.all([
        Member.count(),
        Member.count({ where: { status: "Active" } }),
        Member.count({ where: { created_at: { [Op.gte]: thisMonth } } }),
      ]).then(([t, a, n]) => ({ total: t, active: a, newThisMonth: n }));

  const [
    totalThisMonth, recentRecords,
    upcomingServices,
    upcomingEvents,
    pendingRequests, lowStock, recentActivity,
  ] = await Promise.all([
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
    Service.count({ where: { service_date: { [Op.gte]: now }, status: "published" } }),
    Event.findAll({
      where: { start_date: { [Op.gte]: now }, status: "published" },
      order: [["start_date", "ASC"]],
      limit: 5,
    }),
    InventoryRequest.count({ where: { status: "pending" } }),
    InventoryItem.count({
      where: sequelize.literal("low_stock_threshold IS NOT NULL AND quantity <= low_stock_threshold"),
    }),
    !isMember
      ? AuditLog.findAll({
          order: [["created_at", "DESC"]],
          limit: 10,
          include: [{ model: User, attributes: ["id", "email"], required: false }],
        })
      : Promise.resolve([]),
  ]);

  const roleSummary = await getRoleSummary({
    userId, roleName, leadsMinistryId, leadsMinistryName,
    leadsCellGroupId, leadsCellGroupName, leadsGroupId, leadsGroupName, thisMonth,
  });

  const result = {
    members:       memberCounts,
    finance:       { totalThisMonth, recentRecords },
    services:      { upcoming: upcomingServices },
    events:        { upcoming: upcomingEvents },
    inventory:     { pendingRequests, lowStock },
    ...(isMember ? {} : { recentActivity }),
    roleSummary,
  };

  // Cache for 60 seconds (30 seconds for Member role to keep their data fresh)
  cache.set(cacheKey, result, isMember ? 30000 : 60000);
  return result;
};
