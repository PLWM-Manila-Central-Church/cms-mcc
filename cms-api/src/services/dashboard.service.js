"use strict";

const { Op, fn, col, literal } = require("sequelize");
const sequelize = require("../config/db");
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
  userId,
  memberId,
  roleName,
  leadsMinistryId,
  leadsMinistryName,
  leadsCellGroupId,
  leadsCellGroupName,
  leadsGroupId,
  leadsGroupName,
} = {}) => {
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

  const roleSummary = await getRoleSummary({
    userId,
    roleName,
    leadsMinistryId,
    leadsMinistryName,
    leadsCellGroupId,
    leadsCellGroupName,
    leadsGroupId,
    leadsGroupName,
    thisMonth,
  });

  return {
    members:       { total: totalMembers, active: activeMembers, newThisMonth },
    finance:       { totalThisMonth, recentRecords },
    services:      { total: totalServices, upcoming: upcomingServices },
    events:        { total: totalEvents, upcoming: upcomingEvents },
    inventory:     { totalItems, pendingRequests, lowStock },
    recentActivity,
    roleSummary,
  };
};
