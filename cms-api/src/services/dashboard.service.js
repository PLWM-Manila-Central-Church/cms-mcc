"use strict";

const { Op, fn, col, literal } = require("sequelize");
const sequelize = require("../config/db");
const cache = require("../helpers/cache.helper");
const {
  Member, FinancialRecord, FinancialCategory, Service, Event,
  InventoryItem, InventoryRequest, AuditLog, User,
  ArchiveRecord, InvitedMember, MinistryMembership, MinistryEventInvite,
  Attendance, CellGroup,
} = require("../models");

const dateOnly = (date) => date.toISOString().slice(0, 10);

const todayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

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
      const { start: todayStart, end: todayEnd } = todayRange();
      const [pendingInvites, newMembers, todayAttendance, activeCount, newCount, semiActiveCount, inactiveCount] = await Promise.all([
        InvitedMember.count({ where: { status: "pending" } }),
        Member.count({ where: { created_at: { [Op.gte]: thisMonth } } }),
        Attendance.count({ where: { checked_in_at: { [Op.between]: [todayStart, todayEnd] } } }),
        Member.count({ where: { status: "Active" } }),
        Member.count({ where: { status: "New" } }),
        Member.count({ where: { status: "Semi-Active" } }),
        Member.count({ where: { status: "Inactive" } }),
      ]);
      return {
        scopeName: "Member operations",
        pendingInvites,
        newMembers,
        todayAttendance,
        memberStatusCounts: { active: activeCount, new: newCount, semiActive: semiActiveCount, inactive: inactiveCount },
      };
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
      where: { start_date: { [Op.gte]: now }, status: "Upcoming" },
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

  // ── Registration Team extras: attendance trend + cell group absences ──
  let attendanceTrend = [];
  let cellGroupAbsences = [];
  let latestServiceInfo = null;
  if (roleName === "Registration Team") {
    // Last 10 completed services with attendance broken down by member status
    const recentServices = await Service.findAll({
      where: { status: "completed" },
      order: [["service_date", "DESC"]],
      limit: 10,
      attributes: ["id", "title", "service_date"],
    });

    if (recentServices.length > 0) {
      attendanceTrend = await Promise.all(
        recentServices.map(async (svc) => {
          const [active, newC, semiActive] = await Promise.all([
            Attendance.count({
              include: [{ model: Member, where: { status: "Active" }, required: true, attributes: [] }],
              where: { service_id: svc.id },
            }),
            Attendance.count({
              include: [{ model: Member, where: { status: "New" }, required: true, attributes: [] }],
              where: { service_id: svc.id },
            }),
            Attendance.count({
              include: [{ model: Member, where: { status: "Semi-Active" }, required: true, attributes: [] }],
              where: { service_id: svc.id },
            }),
          ]);
          return {
            service_id: svc.id,
            title: svc.title,
            service_date: svc.service_date,
            active, new: newC, semiActive,
            total: active + newC + semiActive,
          };
        })
      );
    }

    // Per-cell-group attendance at latest service
    const latestService = await Service.findOne({
      where: { status: { [Op.in]: ["completed", "published"] } },
      order: [["service_date", "DESC"]],
      attributes: ["id", "title", "service_date"],
    });

    if (latestService) {
      latestServiceInfo = { id: latestService.id, title: latestService.title, service_date: latestService.service_date };

      const cellGroups = await CellGroup.findAll({
        attributes: ["id", "name"],
      });

      cellGroupAbsences = await Promise.all(
        cellGroups.map(async (cg) => {
          const totalMembers = await Member.count({ where: { cell_group_id: cg.id } });
          const attended = await Attendance.count({
            include: [{
              model: Member,
              where: { cell_group_id: cg.id },
              required: true,
              attributes: [],
            }],
            where: { service_id: latestService.id },
          });
          return {
            cellGroupId: cg.id,
            cellGroupName: cg.name,
            totalMembers,
            attended,
            absent: Math.max(0, totalMembers - attended),
          };
        })
      );
      // Sort by absent descending
      cellGroupAbsences.sort((a, b) => b.absent - a.absent);
    }
  }

  const result = {
    members:       memberCounts,
    finance:       { totalThisMonth, recentRecords },
    services:      { upcoming: upcomingServices },
    events:        { upcoming: upcomingEvents },
    inventory:     { pendingRequests, lowStock },
    ...(isMember ? {} : { recentActivity }),
    roleSummary,
    ...(roleName === "Registration Team" ? { attendanceTrend, cellGroupAbsences, latestService: latestServiceInfo } : {}),
  };
        })
      );
    }

    // Per-cell-group attendance at latest service
    const latestService = await Service.findOne({
      where: { status: { [Op.in]: ["completed", "published"] } },
      order: [["service_date", "DESC"]],
      attributes: ["id", "title", "service_date"],
    });

    if (latestService) {
      const cellGroups = await CellGroup.findAll({
        attributes: ["id", "name"],
      });

      cellGroupAbsences = await Promise.all(
        cellGroups.map(async (cg) => {
          const totalMembers = await Member.count({ where: { cell_group_id: cg.id } });
          const attended = await Attendance.count({
            include: [{
              model: Member,
              where: { cell_group_id: cg.id },
              required: true,
              attributes: [],
            }],
            where: { service_id: latestService.id },
          });
          return {
            cellGroupId: cg.id,
            cellGroupName: cg.name,
            totalMembers,
            attended,
            absent: Math.max(0, totalMembers - attended),
          };
        })
      );
      // Sort by absent descending
      cellGroupAbsences.sort((a, b) => b.absent - a.absent);
    }
  }

  const result = {
    members:       memberCounts,
    finance:       { totalThisMonth, recentRecords },
    services:      { upcoming: upcomingServices },
    events:        { upcoming: upcomingEvents },
    inventory:     { pendingRequests, lowStock },
    ...(isMember ? {} : { recentActivity }),
    roleSummary,
    ...(roleName === "Registration Team" ? {
      attendanceTrend,
      cellGroupAbsences,
      latestService: latestService ? { id: latestService.id, title: latestService.title, service_date: latestService.service_date } : null,
    } : {}),
  };

  // Cache for 60 seconds (30 seconds for Member role to keep their data fresh)
  cache.set(cacheKey, result, isMember ? 30000 : 60000);
  return result;
};
