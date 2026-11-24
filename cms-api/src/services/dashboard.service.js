"use strict";

const { Op, fn, col } = require("sequelize");
const sequelize = require("../config/db");
const cache = require("../helpers/cache.helper");
const { getAttendanceModel } = require("../helpers/attendanceSummary.helper");
const dateOnlyInTimezone = require("../helpers/dateOnlyInTimezone");
const {
  Member, FinancialRecord, FinancialCategory, Expense, Service, Event,
  InventoryItem, InventoryRequest, AuditLog, User,
  ArchiveRecord, InvitedMember, MinistryMembership, MinistryEventInvite,
  Attendance, CellGroup,
} = require("../models");
const { getMemberScopeWhere, getScope } = require("../helpers/scopedLeader.helper");

const MANILA_TZ = "Asia/Manila";
const NOISY_ACTIVITY_ACTIONS = ["LOGIN", "LOGOUT", "REFRESH_TOKEN", "TOKEN_REFRESH", "SESSION_REFRESH"];

const dateOnly = (date) => date.toISOString().slice(0, 10);

const todayRangeManila = (now = new Date()) => {
  const manilaDate = dateOnlyInTimezone(now, MANILA_TZ);
  return {
    manilaDate,
    start: new Date(`${manilaDate}T00:00:00+08:00`),
    end: new Date(`${manilaDate}T23:59:59.999+08:00`),
    monthStart: new Date(`${manilaDate.slice(0, 7)}-01T00:00:00+08:00`),
    monthStartDate: `${manilaDate.slice(0, 7)}-01`,
  };
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

const ACTION_LABELS = {
  CREATE_MEMBER: "Member Added",
  UPDATE_MEMBER: "Member Updated",
  ARCHIVE_MEMBER: "Member Archived",
  RESTORE_MEMBER: "Member Restored",
  CHECK_IN: "Attendance Recorded",
  QR_CHECK_IN: "QR Attendance Scanned",
  APPROVE_BATCH: "Leader Batch Approved",
  CREATE_FINANCE_RECORD: "Offering / Income Recorded",
  UPDATE_FINANCE_RECORD: "Finance Record Updated",
  CREATE_EXPENSE: "Expense Recorded",
  APPROVE_EXPENSE: "Expense Approved",
  CREATE_INVENTORY_ITEM: "Inventory Item Added",
  UPDATE_INVENTORY_ITEM: "Inventory Updated",
  APPROVE_INVENTORY_REQUEST: "Inventory Request Approved",
  CREATE_EVENT: "Event Created",
  UPDATE_EVENT: "Event Updated",
  UPLOAD_ARCHIVE: "Document Archived",
  APPROVE_ARCHIVE: "Archive Approved",
  CREATE_USER: "Staff Account Created",
  UPDATE_USER: "Staff Account Updated",
};

const targetPathForLog = (log) => {
  const table = String(log.table_name || "").toLowerCase();
  const recordId = log.record_id;
  if (table.includes("member")) return recordId ? `/members/${recordId}` : "/members";
  if (table.includes("event")) return recordId ? `/events/${recordId}` : "/events";
  if (table.includes("service") || table.includes("attendance")) return "/attendance";
  if (table.includes("expense")) return "/finance/expenses";
  if (table.includes("financ")) return "/finance";
  if (table.includes("inventory")) return "/inventory";
  if (table.includes("archive")) return "/archives";
  if (table.includes("user")) return "/users";
  if (table.includes("outreach") || table.includes("campaign") || table.includes("follow")) return "/outreach";
  return "/audit-logs";
};

const formatActivityRow = (rawLog) => {
  const log = typeof rawLog?.toJSON === "function" ? rawLog.toJSON() : (rawLog || {});
  const actionKey = String(log.action || "").toUpperCase();
  const label = ACTION_LABELS[actionKey] || actionKey.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) || "System Activity";
  return {
    id: log.id,
    action: log.action,
    label,
    table_name: log.table_name || null,
    record_id: log.record_id || null,
    created_at: log.created_at || log.createdAt || null,
    actor: log.User?.email || "System",
    User: log.User || null,
    target_path: targetPathForLog(log),
  };
};

const safeOutreachCounts = async () => {
  try {
    const { AttendanceFollowUp, NotificationCampaign } = require("../modules/outreach/models");
    const [openFollowUps, pendingCampaigns] = await Promise.all([
      AttendanceFollowUp?.count ? AttendanceFollowUp.count({ where: { status: { [Op.in]: ["open", "assigned"] } } }).catch(() => 0) : 0,
      NotificationCampaign?.count ? NotificationCampaign.count({ where: { status: "pending_approval" } }).catch(() => 0) : 0,
    ]);
    return { openFollowUps: Number(openFollowUps || 0), pendingCampaigns: Number(pendingCampaigns || 0) };
  } catch {
    return { openFollowUps: 0, pendingCampaigns: 0 };
  }
};

const safeFinanceTotals = async () => {
  try {
    const [allIncome, allExpenses, pendingExpenses] = await Promise.all([
      FinancialRecord?.sum ? FinancialRecord.sum("amount", { where: { is_deleted: 0 } }).then((v) => Number(v || 0)).catch(() => 0) : 0,
      Expense?.sum ? Expense.sum("amount", { where: { is_deleted: 0 } }).then((v) => Number(v || 0)).catch(() => 0) : 0,
      Expense?.count ? Expense.count({ where: { is_deleted: 0, status: "pending_approval" } }).catch(() => 0) : 0,
    ]);
    return {
      availableBalance: Math.round((allIncome - allExpenses) * 100) / 100,
      pendingExpenses: Number(pendingExpenses || 0),
    };
  } catch {
    return { availableBalance: 0, pendingExpenses: 0 };
  }
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
  user,
  monthStart,
  monthStartDate,
  todayStart,
  todayEnd,
  AttendanceModel = Attendance,
}) => {
  switch (roleName) {
    case "System Admin": {
      const [activeUsers, pendingArchives, todayAttendance, outreach, finTotals] = await Promise.all([
        User.count({ where: { is_active: 1, is_deleted: 0 } }),
        ArchiveRecord.count({ where: { status: "pending" } }),
        AttendanceModel.count({
          where: {
            checked_in_at: { [Op.between]: [todayStart, todayEnd] },
            check_in_method: { [Op.ne]: "pre-reg" },
            ...(AttendanceModel !== Attendance && { voided_at: null }),
          },
        }),
        safeOutreachCounts(),
        safeFinanceTotals(),
      ]);
      return {
        scopeName: "All systems",
        activeUsers,
        pendingArchives,
        todayAttendance,
        openFollowUps: outreach.openFollowUps,
        pendingCampaigns: outreach.pendingCampaigns,
        availableBalance: finTotals.availableBalance,
        pendingExpenses: finTotals.pendingExpenses,
      };
    }
    case "Pastor": {
      const [pendingArchives, upcomingServices, todayAttendance, outreach] = await Promise.all([
        ArchiveRecord.count({ where: { status: "pending" } }),
        Service.count({ where: { service_date: { [Op.gte]: dateOnlyInTimezone(new Date(), MANILA_TZ) }, status: "published" } }),
        AttendanceModel.count({
          where: {
            checked_in_at: { [Op.between]: [todayStart, todayEnd] },
            check_in_method: { [Op.ne]: "pre-reg" },
            ...(AttendanceModel !== Attendance && { voided_at: null }),
          },
        }),
        safeOutreachCounts(),
      ]);
      return {
        scopeName: "Church overview",
        pendingArchives,
        upcomingServices,
        todayAttendance,
        openFollowUps: outreach.openFollowUps,
        pendingCampaigns: outreach.pendingCampaigns,
      };
    }
    case "Registration Team": {
      const [pendingInvites, newMembers, todayAttendance, activeCount, inactiveCount] = await Promise.all([
        InvitedMember.count({ where: { status: "pending" } }),
        Member.count({ where: { created_at: { [Op.gte]: monthStart } } }),
        AttendanceModel.count({
          where: {
            checked_in_at: { [Op.between]: [todayStart, todayEnd] },
            check_in_method: { [Op.ne]: "pre-reg" },
            ...(AttendanceModel !== Attendance && { voided_at: null }),
          },
        }),
        Member.count({ where: { status: "Active" } }),
        Member.count({ where: { status: "Inactive" } }),
      ]);
      return {
        scopeName: "Member operations",
        pendingInvites,
        newMembers,
        todayAttendance,
        memberStatusCounts: { active: activeCount, inactive: inactiveCount },
      };
    }
    case "Finance Team": {
      const [recordsThisMonth, pendingArchives, finTotals] = await Promise.all([
        FinancialRecord.count({ where: { transaction_date: { [Op.gte]: monthStartDate } } }),
        ArchiveRecord.count({ where: { status: "pending", visibility: { [Op.in]: ["public", "restricted"] } } }),
        safeFinanceTotals(),
      ]);
      return {
        scopeName: "Finance operations",
        recordsThisMonth,
        pendingArchives,
        availableBalance: finTotals.availableBalance,
        pendingExpenses: finTotals.pendingExpenses,
      };
    }
    case "Ministry Leader": {
      const [membersInScope, pendingInvites, pendingRequests] = await Promise.all([
        leadsMinistryId ? MinistryMembership.count({ where: { ministry_role_id: leadsMinistryId } }) : 0,
        leadsMinistryId ? MinistryEventInvite.count({ where: { ministry_role_id: leadsMinistryId, response_status: "pending" } }) : 0,
        userId ? InventoryRequest.count({ where: { requested_by: userId, status: "pending" } }) : 0,
      ]);
      return { scopeName: leadsMinistryName || "Assigned team", membersInScope, pendingInvites, pendingRequests };
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
      return { scopeName: leadsGroupName || "Assigned ministry", membersInScope, eligibleCandidates, pendingRequests };
    }
    case "Leader": {
      const scope = getScope(user || {});
      const assignments = scope?.type === "all" ? (scope.assignments || []) : (scope?.id ? [scope] : []);
      const names = (user?.leaderAssignments || [])
        .filter((assignment) => assignments.some((scopeRow) =>
          scopeRow.type === (assignment.scopeType === "group" ? "group" : assignment.scopeType)
          && Number(scopeRow.id) === Number(assignment.scopeId)))
        .map((assignment) => assignment.teamName)
        .filter(Boolean);
      const memberWhere = await getMemberScopeWhere(user || {});
      const inScope = { [Op.and]: [{ is_deleted: 0 }, memberWhere || { id: { [Op.in]: [] } }] };
      const [membersInScope, pendingRequests] = await Promise.all([
        Member.count({ where: inScope }),
        userId ? InventoryRequest.count({ where: { requested_by: userId, status: "pending" } }) : 0,
      ]);
      const scopeName = scope?.type === "all"
        ? (names.length ? names.join(" + ") : "All assigned teams")
        : (names[0] || (scope?.type === "cell_group"
          ? leadsCellGroupName || "Assigned cell group"
          : (assignments.length ? (leadsGroupName || "Assigned ministry") : "No team assigned")));
      let eligibleCandidates = 0;
      if (scope?.type === "group" && scope.id) {
        const isYa = /young adults|ya/i.test(scopeName || "");
        eligibleCandidates = isYa
          ? await Member.count({ where: youngAdultCandidateWhere() })
          : await Member.count({ where: { group_id: null } });
      }
      return { scopeName, membersInScope, eligibleCandidates, pendingRequests, assignedTeamCount: assignments.length };
    }
    default:
      return { scopeName: roleName || "Dashboard" };
  }
};

const buildBatchedAttendanceTrend = async (recentServices, AttendanceModel) => {
  if (!recentServices.length) return [];
  const serviceIds = recentServices.map((s) => s.id);
  const grouped = await AttendanceModel.findAll({
    attributes: [
      "service_id",
      [col("Member.status"), "member_status"],
      [fn("COUNT", col("Attendance.id")), "cnt"],
    ],
    include: [{ model: Member, attributes: [], required: true }],
    where: {
      service_id: { [Op.in]: serviceIds },
      check_in_method: { [Op.ne]: "pre-reg" },
      ...(AttendanceModel !== Attendance && { voided_at: null }),
    },
    group: ["service_id", "Member.status"],
    raw: true,
  });

  const byService = new Map();
  for (const row of grouped || []) {
    const sid = Number(row.service_id);
    const entry = byService.get(sid) || { active: 0, inactive: 0 };
    if (row.member_status === "Active") entry.active += Number(row.cnt || 0);
    else entry.inactive += Number(row.cnt || 0);
    byService.set(sid, entry);
  }

  return recentServices.map((svc) => {
    const counts = byService.get(Number(svc.id)) || { active: 0, inactive: 0 };
    return {
      service_id: svc.id,
      title: svc.title,
      service_date: svc.service_date,
      active: counts.active,
      inactive: counts.inactive,
      total: counts.active + counts.inactive,
    };
  });
};

const buildBatchedCellGroupAbsences = async (latestService, AttendanceModel) => {
  const [cellGroups, memberTotals, attendanceTotals] = await Promise.all([
    CellGroup.findAll({ attributes: ["id", "name"], raw: true }),
    Member.findAll({
      attributes: ["cell_group_id", [fn("COUNT", col("id")), "cnt"]],
      where: { cell_group_id: { [Op.ne]: null } },
      group: ["cell_group_id"],
      raw: true,
    }),
    AttendanceModel.findAll({
      attributes: [
        [col("Member.cell_group_id"), "cell_group_id"],
        [fn("COUNT", col("Attendance.id")), "cnt"],
      ],
      include: [{ model: Member, where: { cell_group_id: { [Op.ne]: null } }, attributes: [], required: true }],
      where: {
        service_id: latestService.id,
        check_in_method: { [Op.ne]: "pre-reg" },
        ...(AttendanceModel !== Attendance && { voided_at: null }),
      },
      group: ["Member.cell_group_id"],
      raw: true,
    }),
  ]);

  const totalByCg = new Map((memberTotals || []).map((r) => [Number(r.cell_group_id), Number(r.cnt || 0)]));
  const attendedByCg = new Map((attendanceTotals || []).map((r) => [Number(r.cell_group_id), Number(r.cnt || 0)]));

  const absences = (cellGroups || []).map((cg) => {
    const totalMembers = totalByCg.get(Number(cg.id)) || 0;
    const attended = attendedByCg.get(Number(cg.id)) || 0;
    return {
      cellGroupId: cg.id,
      cellGroupName: cg.name,
      totalMembers,
      attended,
      absent: Math.max(0, totalMembers - attended),
    };
  });
  absences.sort((a, b) => b.absent - a.absent);
  return absences;
};

exports.getStats = async ({
  userId, memberId, roleName, leadsMinistryId, leadsMinistryName,
  leadsCellGroupId, leadsCellGroupName, leadsGroupId, leadsGroupName,
  user = {},
} = {}) => {
  const now = new Date();
  const { manilaDate, start: todayStart, end: todayEnd, monthStart, monthStartDate } = todayRangeManila(now);
  const isMember = roleName === "Member";

  const isUnifiedLeader = roleName === "Leader";
  const leaderScope = isUnifiedLeader ? getScope(user) : null;
  const leaderScopeSignature = (leaderScope?.assignments || [])
    .map((assignment) => `${assignment.type}:${assignment.id}`)
    .sort()
    .join(",");
  const cacheKey = isMember
    ? `dashboard:member:${memberId}`
    : isUnifiedLeader
      ? `dashboard:Leader:${userId || ""}:${leaderScope?.type || ""}:${leaderScope?.id || ""}:${leaderScopeSignature}`
      : `dashboard:${roleName}:${leadsMinistryId || ""}:${leadsCellGroupId || ""}:${leadsGroupId || ""}`;

  const cached = cache.get(cacheKey);
  if (cached) return cached;

  const needsAttendanceModel = ["System Admin", "Pastor", "Registration Team"].includes(roleName);
  const AttendanceModel = needsAttendanceModel ? (await getAttendanceModel()) || Attendance : Attendance;

  const financeWhere = { is_deleted: 0, transaction_date: { [Op.gte]: monthStartDate } };
  if (isMember && memberId) financeWhere.member_id = memberId;
  const recentFinanceWhere = { is_deleted: 0, ...(isMember && memberId ? { member_id: memberId } : {}) };
  const canSeeFinanceDetails = ["System Admin", "Pastor", "Finance Team"].includes(roleName);

  const leaderMemberWhere = isUnifiedLeader ? await getMemberScopeWhere(user) : null;
  const memberScopedWhere = leaderMemberWhere
    ? { [Op.and]: [{ is_deleted: 0 }, leaderMemberWhere] }
    : { is_deleted: 0 };

  const memberCounts = isMember
    ? { total: 0, active: 0, newThisMonth: 0 }
    : isUnifiedLeader
      ? await Promise.all([
          Member.count({ where: memberScopedWhere }),
          Member.count({ where: { [Op.and]: [memberScopedWhere, { status: "Active" }] } }),
          Member.count({ where: { [Op.and]: [memberScopedWhere, { created_at: { [Op.gte]: monthStart } }] } }),
        ]).then(([t, a, n]) => ({ total: t, active: a, newThisMonth: n }))
      : await Promise.all([
          Member.count(),
          Member.count({ where: { status: "Active" } }),
          Member.count({ where: { created_at: { [Op.gte]: monthStart } } }),
        ]).then(([t, a, n]) => ({ total: t, active: a, newThisMonth: n }));

  const [
    totalThisMonth, totalExpenseThisMonth, recentRecords,
    upcomingServices, upcomingServiceList,
    upcomingEvents,
    pendingRequests, lowStock, rawRecentActivity,
  ] = await Promise.all([
    isUnifiedLeader ? Promise.resolve(0) : FinancialRecord.sum("amount", { where: financeWhere }).then((v) => Number(v || 0)),
    canSeeFinanceDetails && Expense?.sum
      ? Expense.sum("amount", { where: { is_deleted: 0, date: { [Op.gte]: monthStartDate } } }).then((v) => Number(v || 0))
      : Promise.resolve(0),
    isUnifiedLeader ? Promise.resolve([]) : FinancialRecord.findAll({
      where: recentFinanceWhere,
      order: [["transaction_date", "DESC"]],
      limit: 6,
      include: [
        { model: Member,            attributes: ["id", "first_name", "last_name"], required: false },
        { model: FinancialCategory, as: "category", attributes: ["id", "name"],   required: false },
      ],
    }),
    Service.count({ where: { service_date: { [Op.gte]: manilaDate }, status: "published" } }),
    Service.findAll({
      where: { service_date: { [Op.gte]: manilaDate }, status: "published" },
      order: [["service_date", "ASC"]],
      limit: 4,
      attributes: ["id", "title", "service_date", "service_time", "status"],
    }),
    Event.findAll({
      where: { start_date: { [Op.gte]: manilaDate }, status: "Upcoming" },
      order: [["start_date", "ASC"]],
      limit: 5,
    }),
    isUnifiedLeader
      ? InventoryRequest.count({ where: { status: "pending", requested_by: userId } })
      : InventoryRequest.count({ where: { status: "pending" } }),
    isUnifiedLeader ? Promise.resolve(0) : InventoryItem.count({
      where: sequelize.literal("low_stock_threshold IS NOT NULL AND quantity <= low_stock_threshold"),
    }),
    !isMember && !isUnifiedLeader
      ? AuditLog.findAll({
          where: { action: { [Op.notIn]: NOISY_ACTIVITY_ACTIONS } },
          order: [["created_at", "DESC"]],
          limit: 8,
          include: [{ model: User, attributes: ["id", "email"], required: false }],
        })
      : Promise.resolve([]),
  ]);

  const recentActivity = (rawRecentActivity || []).map(formatActivityRow);

  const roleSummary = await getRoleSummary({
    userId, roleName, leadsMinistryId, leadsMinistryName,
    leadsCellGroupId, leadsCellGroupName, leadsGroupId, leadsGroupName,
    monthStart, monthStartDate, todayStart, todayEnd,
    user, AttendanceModel,
  });

  // Merge upcoming services & events chronologically for Upcoming Schedules panels
  const upcomingSchedules = [
    ...(upcomingServiceList || []).map((svc) => ({
      id: `service-${svc.id}`,
      kind: "Service",
      title: svc.title,
      date: svc.service_date,
      time: svc.service_time || null,
      detail: "Regular worship service",
      path: `/services/${svc.id}/attendance`,
    })),
    ...(upcomingEvents || []).map((ev) => ({
      id: `event-${ev.id}`,
      kind: "Event",
      title: ev.title,
      date: ev.start_date,
      time: ev.start_time || null,
      detail: ev.location || "Church event",
      path: `/events/${ev.id}`,
    })),
  ]
    .sort((a, b) => String(a.date || "").localeCompare(String(b.date || "")))
    .slice(0, 6);

  let attendanceTrend = [];
  let cellGroupAbsences = [];
  let latestServiceInfo = null;
  let attendanceOverview = [];

  if (["System Admin", "Pastor", "Registration Team"].includes(roleName)) {
    const recentServices = await Service.findAll({
      where: { status: "completed", is_deleted: 0 },
      order: [["service_date", "DESC"]],
      limit: roleName === "Registration Team" ? 10 : 6,
      attributes: ["id", "title", "service_date"],
    });

    if (recentServices.length > 0) {
      const trend = await buildBatchedAttendanceTrend(recentServices, AttendanceModel);
      if (roleName === "Registration Team") {
        attendanceTrend = trend;
      }
      attendanceOverview = trend.slice(0, 4).map((row, index) => {
        const prev = trend[index + 1];
        const delta = prev ? row.total - prev.total : null;
        return { ...row, delta };
      });
    }
  }

  if (roleName === "Registration Team") {
    const latestService = await Service.findOne({
      where: { status: "completed", is_deleted: 0, service_date: { [Op.lte]: manilaDate } },
      order: [["service_date", "DESC"]],
      attributes: ["id", "title", "service_date"],
    });

    if (latestService) {
      latestServiceInfo = { id: latestService.id, title: latestService.title, service_date: latestService.service_date };
      cellGroupAbsences = await buildBatchedCellGroupAbsences(latestService, AttendanceModel);
    }
  }

  const result = {
    members: memberCounts,
    finance: {
      totalThisMonth,
      totalExpenseThisMonth,
      netThisMonth: Number(totalThisMonth || 0) - Number(totalExpenseThisMonth || 0),
      availableBalance: roleSummary.availableBalance ?? (Number(totalThisMonth || 0) - Number(totalExpenseThisMonth || 0)),
      pendingExpenses: roleSummary.pendingExpenses ?? 0,
      recentRecords,
    },
    services: { upcoming: upcomingServices, list: upcomingServiceList || [] },
    events: { upcoming: upcomingEvents },
    inventory: { pendingRequests, lowStock },
    upcomingSchedules,
    ...(attendanceOverview.length ? { attendanceOverview } : {}),
    ...(isMember ? {} : { recentActivity }),
    roleSummary,
    ...(roleName === "Registration Team" ? { attendanceTrend, cellGroupAbsences, latestService: latestServiceInfo } : {}),
  };

  cache.set(cacheKey, result, isMember ? 30000 : 60000);
  return result;
};
