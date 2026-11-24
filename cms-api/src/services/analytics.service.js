"use strict";

const { Op, QueryTypes, fn, col, literal } = require("sequelize");
const sequelize = require("../config/db");
const { Member, FinancialRecord, Expense, Attendance } = require("../models");
const { getAttendanceModel } = require("../helpers/attendanceSummary.helper");
const AppError = require("../helpers/AppError");
const { appendOtherGroupSummary } = require("../helpers/analyticsDemographics.helper");
const { getMemberScopeWhere, isScopedLeader } = require("../helpers/scopedLeader.helper");

const REPORT_ROLES = new Set(["System Admin", "Pastor", "Registration Team", "Finance Team"]);
const asNumber = (value) => Number(value || 0);
const asMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;
const manilaToday = () => {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date()).map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const parseDateRange = ({ date_from, date_to } = {}) => {
  const today = manilaToday();
  const to = date_to || today;
  const from = date_from || `${today.slice(0, 4)}-01-01`;
  const isCalendarDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(parsed) && new Date(parsed).toISOString().slice(0, 10) === value;
  };
  if (!isCalendarDate(from) || !isCalendarDate(to) || from > to) {
    throw AppError.badRequest("INVALID_DATE_RANGE", "Choose a valid date range with the start date on or before the end date");
  }
  const spanDays = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000;
  if (spanDays > 5 * 366) throw AppError.badRequest("DATE_RANGE_TOO_LARGE", "Analytics date ranges cannot exceed five years");
  const nextDate = new Date(`${to}T00:00:00Z`);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);
  return { from, to, fromDateTime: `${from} 00:00:00`, throughDateTime: `${to} 23:59:59.999`, toExclusive: `${nextDate.toISOString().slice(0, 10)} 00:00:00` };
};

const dailyAggregate = async (Model, dateColumn, range, extraWhere = {}, amountColumn = null, include = []) => {
  const periodExpression = fn("DATE_FORMAT", col(dateColumn), "%Y-%m-%d");
  const aggregateExpression = amountColumn
    ? fn("SUM", col(amountColumn))
    : fn("COUNT", literal("*"));
  return Model.findAll({
    attributes: [[periodExpression, "period"], [aggregateExpression, "total"]],
    where: { ...extraWhere, [dateColumn]: { [Op.between]: [range.fromDateTime, range.throughDateTime] } },
    ...(include.length && { include }),
    group: [periodExpression],
    order: [[literal("period"), "ASC"]],
    raw: true,
  });
};

const granularityFor = (period, range) => {
  if (period === "week") return "day";
  if (period === "month") return "week";
  if (period === "year") return "month";
  const spanDays = (Date.parse(`${range.to}T00:00:00Z`) - Date.parse(`${range.from}T00:00:00Z`)) / 86400000;
  return spanDays <= 31 ? "day" : spanDays <= 183 ? "week" : "month";
};

const bucketForDate = (dateString, granularity) => {
  const date = new Date(`${dateString}T00:00:00Z`);
  if (granularity === "month") return dateString.slice(0, 7);
  if (granularity === "week") {
    date.setUTCDate(date.getUTCDate() - date.getUTCDay());
    return date.toISOString().slice(0, 10);
  }
  return dateString.slice(0, 10);
};

const fillBuckets = (from, to, rows, granularity, fields = ["total"]) => {
  const totals = new Map();
  for (const row of rows || []) {
    const key = bucketForDate(String(row.period).slice(0, 10), granularity);
    const current = totals.get(key) || Object.fromEntries(fields.map((field) => [field, 0]));
    for (const field of fields) current[field] += asNumber(row[field] ?? row.total);
    totals.set(key, current);
  }

  const cursor = new Date(`${from}T00:00:00Z`);
  const last = new Date(`${to}T00:00:00Z`);
  if (granularity === "week") cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());
  else if (granularity === "month") cursor.setUTCDate(1);
  const result = [];
  while (cursor <= last) {
    const period = granularity === "month"
      ? cursor.toISOString().slice(0, 7)
      : cursor.toISOString().slice(0, 10);
    result.push({ period, ...Object.fromEntries(fields.map((field) => [field, totals.get(period)?.[field] || 0])) });
    if (granularity === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    else cursor.setUTCDate(cursor.getUTCDate() + (granularity === "week" ? 7 : 1));
  }
  return result;
};

const GATHERING_TYPE_LABELS = {
  lords_day: "Lord's Day Service",
  wednesday_service: "Wednesday Service",
  hs_ya_service: "HS / YA Fellowship",
  bible_seminar: "Bible Seminar",
  prayer_meeting: "Prayer Meeting",
  other: "Other Gathering",
};
const round1 = (value) => Math.round((Number(value) || 0) * 10) / 10;
const safeSelect = (sql, options) => sequelize.query(sql, { type: QueryTypes.SELECT, ...options })
  .then((rows) => (Array.isArray(rows) ? rows : []))
  .catch(() => []);

exports.getAnalytics = async ({ user, date_from, date_to, period = "year" } = {}) => {
  if (!REPORT_ROLES.has(user?.roleName)) throw AppError.forbidden("This role cannot view consolidated analytics");
  const range = parseDateRange({ date_from, date_to });
  const bucket = granularityFor(period, range);
  const demographicsAsOfDate = manilaToday();
  const canSeeMembers = ["System Admin", "Pastor", "Registration Team"].includes(user.roleName);
  const canSeeAttendance = ["System Admin", "Pastor", "Registration Team"].includes(user.roleName);
  const canSeeFinance = ["System Admin", "Pastor", "Finance Team"].includes(user.roleName);
  const canSeeOps = ["System Admin", "Pastor"].includes(user.roleName);
  const result = {
    range: { from: range.from, to: range.to },
    period: { preset: period, bucket },
    members: null,
    demographics: null,
    member_growth: null,
    member_insights: null,
    attendance: null,
    attendance_insights: null,
    finance: null,
    finance_insights: null,
    group_insights: null,
    operations_snapshot: null,
  };

  const priorFrom = `${Number(range.from.slice(0, 4)) - 1}${range.from.slice(4)}`;
  const priorTo = `${Number(range.to.slice(0, 4)) - 1}${range.to.slice(4)}`;

  const memberTask = canSeeMembers ? (async () => {
    const [
      active,
      inactive,
      total,
      ageBands,
      gender,
      cellGroups,
      groups,
      cellGroupCategoryCounts,
      groupCategoryCounts,
      growthRows,
      archivedRows,
      priorGrowthRows,
      ministryParticipationRows,
      quietCellRows,
    ] = await Promise.all([
      Member.count({ where: { status: "Active" } }),
      Member.count({ where: { status: "Inactive" } }),
      Member.count(),
      sequelize.query(`
        SELECT CASE
          WHEN birthdate IS NULL OR birthdate > :asOfDate THEN 'Unknown'
          WHEN TIMESTAMPDIFF(YEAR, birthdate, :asOfDate) < 18 THEN '0-17'
          WHEN TIMESTAMPDIFF(YEAR, birthdate, :asOfDate) < 30 THEN '18-29'
          WHEN TIMESTAMPDIFF(YEAR, birthdate, :asOfDate) < 50 THEN '30-49'
          ELSE '50+'
        END AS label, COUNT(*) AS total
        FROM members WHERE is_deleted = 0 GROUP BY label ORDER BY label`,
        { type: QueryTypes.SELECT, replacements: { asOfDate: demographicsAsOfDate } },
      ),
      sequelize.query(`
        SELECT COALESCE(NULLIF(gender, ''), 'Unspecified') AS label, COUNT(*) AS total
        FROM members WHERE is_deleted = 0 GROUP BY gender ORDER BY label`,
        { type: QueryTypes.SELECT },
      ),
      sequelize.query(`
        SELECT cg.id, COALESCE(cg.name, 'Unassigned') AS label, COUNT(m.id) AS total
        FROM members m LEFT JOIN cell_groups cg ON cg.id = m.cell_group_id
        WHERE m.is_deleted = 0 GROUP BY cg.id, cg.name ORDER BY total DESC LIMIT 20`,
        { type: QueryTypes.SELECT },
      ),
      sequelize.query(`
        SELECT g.id, COALESCE(g.name, 'Unassigned') AS label, COUNT(m.id) AS total
        FROM members m LEFT JOIN ministry_groups g ON g.id = m.group_id
        WHERE m.is_deleted = 0 GROUP BY g.id, g.name ORDER BY total DESC LIMIT 20`,
        { type: QueryTypes.SELECT },
      ),
      sequelize.query(`
        SELECT COUNT(*) AS category_count
        FROM (
          SELECT cg.id, cg.name
          FROM members m LEFT JOIN cell_groups cg ON cg.id = m.cell_group_id
          WHERE m.is_deleted = 0
          GROUP BY cg.id, cg.name
        ) AS cell_group_categories`,
        { type: QueryTypes.SELECT },
      ),
      sequelize.query(`
        SELECT COUNT(*) AS category_count
        FROM (
          SELECT g.id, g.name
          FROM members m LEFT JOIN ministry_groups g ON g.id = m.group_id
          WHERE m.is_deleted = 0
          GROUP BY g.id, g.name
        ) AS member_group_categories`,
        { type: QueryTypes.SELECT },
      ),
      sequelize.query(`
        SELECT DATE_FORMAT(COALESCE(join_date, DATE(created_at)), '%Y-%m-%d') AS period, COUNT(*) AS total
        FROM members
        WHERE is_deleted = 0
          AND (import_batch IS NULL OR join_date IS NOT NULL)
          AND COALESCE(join_date, DATE(created_at)) >= :fromDate
          AND COALESCE(join_date, DATE(created_at)) <= :toDate
        GROUP BY period ORDER BY period`,
        { type: QueryTypes.SELECT, replacements: { fromDate: range.from, toDate: range.to } },
      ),
      safeSelect(`
        SELECT COUNT(*) AS total
        FROM members
        WHERE is_deleted = 1 AND deleted_at BETWEEN :fromDt AND :toDt`,
        { replacements: { fromDt: range.fromDateTime, toDt: range.throughDateTime } },
      ),
      safeSelect(`
        SELECT COUNT(*) AS total
        FROM members
        WHERE is_deleted = 0
          AND (import_batch IS NULL OR join_date IS NOT NULL)
          AND COALESCE(join_date, DATE(created_at)) >= :priorFrom
          AND COALESCE(join_date, DATE(created_at)) <= :priorTo`,
        { replacements: { priorFrom, priorTo } },
      ),
      safeSelect(`
        SELECT g.id, g.name AS label,
               COUNT(m.id) AS total,
               SUM(CASE WHEN m.status = 'Active' THEN 1 ELSE 0 END) AS active
        FROM ministry_groups g
        LEFT JOIN members m ON m.group_id = g.id AND m.is_deleted = 0
        WHERE g.is_deleted = 0
        GROUP BY g.id, g.name
        ORDER BY total DESC LIMIT 12`),
      safeSelect(`
        SELECT cg.id, cg.name AS label, COUNT(m.id) AS member_count,
               MAX(a.checked_in_at) AS last_activity_at
        FROM cell_groups cg
        LEFT JOIN members m ON m.cell_group_id = cg.id AND m.is_deleted = 0
        LEFT JOIN attendances a ON a.member_id = m.id AND a.checked_in_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        WHERE cg.is_deleted = 0
        GROUP BY cg.id, cg.name
        HAVING last_activity_at IS NULL
        ORDER BY member_count DESC LIMIT 10`),
    ]);
    const newInRange = growthRows.reduce((sum, row) => sum + asNumber(row.total), 0);
    const archivedInRange = asNumber(archivedRows[0]?.total);
    const priorYearNew = asNumber(priorGrowthRows[0]?.total);
    const yoyDeltaPct = priorYearNew > 0 ? round1(((newInRange - priorYearNew) / priorYearNew) * 100) : null;

    return {
      members: { total, active, inactive, new_in_range: newInRange },
      member_insights: {
        archived_in_range: archivedInRange,
        net_growth: newInRange - archivedInRange,
        retention_rate_pct: total > 0 ? round1((active / total) * 100) : 0,
        prior_year_new: priorYearNew,
        yoy_delta_pct: yoyDeltaPct,
      },
      demographics: {
        age_bands: ageBands.map((row) => ({ label: row.label, total: asNumber(row.total) })),
        gender: gender.map((row) => ({ label: row.label, total: asNumber(row.total) })),
        cell_groups: appendOtherGroupSummary(cellGroups, {
          totalMembers: total,
          totalCategories: cellGroupCategoryCounts[0]?.category_count,
          categoryLabel: "cell groups",
        }),
        groups: appendOtherGroupSummary(groups, {
          totalMembers: total,
          totalCategories: groupCategoryCounts[0]?.category_count,
          categoryLabel: "groups",
        }),
      },
      growth: fillBuckets(range.from, range.to, growthRows, bucket),
      group_insights: {
        ministry_participation: ministryParticipationRows.map((r) => {
          const tot = asNumber(r.total);
          const act = asNumber(r.active);
          return {
            id: r.id,
            label: r.label,
            total: tot,
            active: act,
            active_rate_pct: tot > 0 ? round1((act / tot) * 100) : 0,
          };
        }),
        quiet_cell_groups: quietCellRows.map((r) => ({
          id: r.id,
          label: r.label,
          member_count: asNumber(r.member_count),
        })),
      },
    };
  })() : Promise.resolve(null);

  const attendanceTask = canSeeAttendance ? (async () => {
    const AttendanceModel = await getAttendanceModel();
    const serviceRows = await dailyAggregate(AttendanceModel, "checked_in_at", range, {
      check_in_method: { [Op.ne]: "pre-reg" },
      ...(AttendanceModel !== Attendance && { voided_at: null }),
    });
    let eventRows = [];
    try {
      const { getQrSchemaReadiness } = require("../modules/qr-attendance/featureSettings");
      if ((await getQrSchemaReadiness()).ready) {
        const { EventAttendance } = require("../modules/qr-attendance/models");
        eventRows = await dailyAggregate(EventAttendance, "checked_in_at", range, { voided_at: null });
      }
    } catch {
      // Event QR attendance is optional on older/local schemas.
    }
    const [gatheringRows, visitorRows, followUpRows] = await Promise.all([
      safeSelect(`
        SELECT COALESCE(s.gathering_type, 'lords_day') AS gathering_type,
               COUNT(DISTINCT s.id) AS services_count,
               COUNT(a.id) AS checkins
        FROM services s
        LEFT JOIN attendances a ON a.service_id = s.id AND a.check_in_method != 'pre-reg'
          AND a.checked_in_at BETWEEN :fromDt AND :toDt
        WHERE s.is_deleted = 0 AND s.service_date BETWEEN :fromDate AND :toDate
        GROUP BY COALESCE(s.gathering_type, 'lords_day')
        ORDER BY checkins DESC`,
        { replacements: { fromDt: range.fromDateTime, toDt: range.throughDateTime, fromDate: range.from, toDate: range.to } },
      ),
      safeSelect(`
        SELECT visit_type, COUNT(*) AS total
        FROM visitor_records
        WHERE is_deleted = 0 AND visit_date BETWEEN :fromDate AND :toDate
        GROUP BY visit_type`,
        { replacements: { fromDate: range.from, toDate: range.to } },
      ),
      safeSelect(`
        SELECT COUNT(*) AS total
        FROM attendance_follow_ups
        WHERE status IN ('open', 'assigned')`),
    ]);

    const serviceByDay = new Map(serviceRows.map((row) => [String(row.period).slice(0, 10), asNumber(row.total)]));
    const eventsByDay = new Map(eventRows.map((row) => [String(row.period).slice(0, 10), asNumber(row.total)]));
    const dailyRows = [];
    const cursor = new Date(`${range.from}T00:00:00Z`);
    const last = new Date(`${range.to}T00:00:00Z`);
    while (cursor <= last) {
      const day = cursor.toISOString().slice(0, 10);
      dailyRows.push({ period: day, service: serviceByDay.get(day) || 0, events: eventsByDay.get(day) || 0 });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    const attendanceBuckets = fillBuckets(range.from, range.to, dailyRows, bucket, ["service", "events"]);
    const serviceCheckins = serviceRows.reduce((sum, row) => sum + asNumber(row.total), 0);
    const eventCheckins = eventRows.reduce((sum, row) => sum + asNumber(row.total), 0);

    // Week-over-week comparison using trailing 14 days of dailyRows
    const last7 = dailyRows.slice(-7).reduce((s, r) => s + r.service + r.events, 0);
    const prev7 = dailyRows.slice(-14, -7).reduce((s, r) => s + r.service + r.events, 0);
    const wowDeltaPct = prev7 > 0 ? round1(((last7 - prev7) / prev7) * 100) : null;

    const gatheringsCount = gatheringRows.reduce((s, r) => s + asNumber(r.services_count), 0);
    const firstTimeVisitors = asNumber(visitorRows.find((r) => r.visit_type === "first_time")?.total);
    const returningVisitors = asNumber(visitorRows.find((r) => r.visit_type === "returning")?.total);

    return {
      attendance: {
        service_checkins: serviceCheckins,
        event_checkins: eventCheckins,
        buckets: attendanceBuckets,
        monthly: attendanceBuckets,
      },
      attendance_insights: {
        gatherings_count: gatheringsCount,
        average_per_gathering: gatheringsCount > 0 ? round1(serviceCheckins / gatheringsCount) : 0,
        first_time_visitors: firstTimeVisitors,
        returning_visitors: returningVisitors,
        total_visitors: firstTimeVisitors + returningVisitors,
        absent_streak_count: asNumber(followUpRows[0]?.total),
        week_over_week_delta_pct: wowDeltaPct,
        by_gathering_type: gatheringRows.map((r) => ({
          type: r.gathering_type,
          label: GATHERING_TYPE_LABELS[r.gathering_type] || r.gathering_type,
          services_count: asNumber(r.services_count),
          total: asNumber(r.checkins),
        })),
      },
    };
  })() : Promise.resolve(null);

  const financeTask = canSeeFinance ? (async () => {
    const [incomeRows, expenseRows, incomeByCat, expenseByCat] = await Promise.all([
      dailyAggregate(FinancialRecord, "transaction_date", range, { is_deleted: 0 }, "amount"),
      dailyAggregate(Expense, "date", range, { is_deleted: 0 }, "amount"),
      safeSelect(`
        SELECT COALESCE(fc.name, 'Uncategorized') AS label, SUM(fr.amount) AS total
        FROM financial_records fr
        LEFT JOIN financial_categories fc ON fc.id = fr.category_id
        WHERE fr.is_deleted = 0 AND fr.transaction_date BETWEEN :fromDate AND :toDate
        GROUP BY fc.name
        ORDER BY total DESC LIMIT 12`,
        { replacements: { fromDate: range.from, toDate: range.to } },
      ),
      safeSelect(`
        SELECT COALESCE(ec.name, 'General Expense') AS label, SUM(e.amount) AS total
        FROM expenses e
        LEFT JOIN expense_categories ec ON ec.id = e.category_id
        WHERE e.is_deleted = 0 AND e.date BETWEEN :fromDate AND :toDate
        GROUP BY ec.name
        ORDER BY total DESC LIMIT 12`,
        { replacements: { fromDate: range.from, toDate: range.to } },
      ),
    ]);
    const daily = new Map();
    for (const row of incomeRows || []) daily.set(String(row.period).slice(0, 10), {
      ...(daily.get(String(row.period).slice(0, 10)) || {}), income: asMoney(row.total),
    });
    for (const row of expenseRows || []) daily.set(String(row.period).slice(0, 10), {
      ...(daily.get(String(row.period).slice(0, 10)) || {}), expenses: asMoney(row.total),
    });
    const dailyRows = [...daily.entries()].map(([period, row]) => ({ period, ...row }));
    const buckets = fillBuckets(range.from, range.to, dailyRows, bucket, ["income", "expenses"])
      .map((row) => ({ ...row, income: asMoney(row.income), expenses: asMoney(row.expenses), net: asMoney(row.income - row.expenses) }));
    const incomeTotal = asMoney((incomeRows || []).reduce((sum, row) => sum + asMoney(row.total), 0));
    const expenseTotal = asMoney((expenseRows || []).reduce((sum, row) => sum + asMoney(row.total), 0));
    const netTotal = asMoney(incomeTotal - expenseTotal);

    return {
      finance: { income: incomeTotal, expenses: expenseTotal, net: netTotal, buckets },
      finance_insights: {
        expense_ratio_pct: incomeTotal > 0 ? round1((expenseTotal / incomeTotal) * 100) : 0,
        net_margin_pct: incomeTotal > 0 ? round1((netTotal / incomeTotal) * 100) : 0,
        by_income_category: incomeByCat.map((r) => ({ label: r.label, total: asMoney(r.total) })),
        by_expense_category: expenseByCat.map((r) => ({ label: r.label, total: asMoney(r.total) })),
      },
    };
  })() : Promise.resolve(null);

  const opsTask = canSeeOps ? (async () => {
    const [invRows, backupRows] = await Promise.all([
      safeSelect(`
        SELECT COUNT(*) AS total_items,
               SUM(CASE WHEN quantity <= low_stock_threshold THEN 1 ELSE 0 END) AS low_stock
        FROM inventory_items WHERE is_deleted = 0`),
      safeSelect(`
        SELECT setting_value FROM system_settings WHERE setting_key = 'last_verified_backup_at' LIMIT 1`),
    ]);
    return {
      inventory_total_items: asNumber(invRows[0]?.total_items),
      inventory_low_stock: asNumber(invRows[0]?.low_stock),
      last_verified_backup_at: backupRows[0]?.setting_value || null,
    };
  })() : Promise.resolve(null);

  const [memberData, attendanceData, financeData, opsData] = await Promise.all([
    memberTask,
    attendanceTask,
    financeTask,
    opsTask,
  ]);
  if (memberData) {
    result.members = memberData.members;
    result.demographics = memberData.demographics;
    result.member_growth = memberData.growth;
    result.member_insights = memberData.member_insights;
    result.group_insights = memberData.group_insights;
  }
  if (attendanceData) {
    result.attendance = attendanceData.attendance;
    const activeCount = asNumber(memberData?.members?.active);
    const avgGathering = attendanceData.attendance_insights.average_per_gathering;
    result.attendance_insights = {
      ...attendanceData.attendance_insights,
      attendance_rate_pct: activeCount > 0 && avgGathering > 0 ? round1((avgGathering / activeCount) * 100) : 0,
    };
  }
  if (financeData) {
    result.finance = financeData.finance;
    result.finance_insights = financeData.finance_insights;
  }
  result.operations_snapshot = opsData;
  return result;
};

exports.getTeamAttendanceAnalytics = async ({ user, date_from, date_to, period = "year" } = {}) => {
  if (!isScopedLeader(user)) {
    throw AppError.forbidden("Team attendance reports are available only to assigned leaders");
  }
  const range = parseDateRange({ date_from, date_to });
  const bucket = granularityFor(period, range);
  const memberScope = await getMemberScopeWhere(user);
  const AttendanceModel = await getAttendanceModel();
  const serviceRows = await dailyAggregate(
    AttendanceModel,
    "checked_in_at",
    range,
    {
      check_in_method: { [Op.ne]: "pre-reg" },
      ...(AttendanceModel !== Attendance && { voided_at: null }),
    },
    null,
    [{ model: Member, attributes: [], where: memberScope, required: true }],
  );

  let eventRows = [];
  try {
    const { getQrSchemaReadiness } = require("../modules/qr-attendance/featureSettings");
    if ((await getQrSchemaReadiness()).ready) {
      const { EventAttendance } = require("../modules/qr-attendance/models");
      eventRows = await dailyAggregate(
        EventAttendance,
        "checked_in_at",
        range,
        { voided_at: null },
        null,
        [{ model: Member, as: "member", attributes: [], where: memberScope, required: true }],
      );
    }
  } catch {
    // Event QR attendance is optional on databases where its additive schema is not ready.
  }

  const serviceByDay = new Map(serviceRows.map((row) => [String(row.period).slice(0, 10), asNumber(row.total)]));
  const eventsByDay = new Map(eventRows.map((row) => [String(row.period).slice(0, 10), asNumber(row.total)]));
  const dailyRows = [];
  const cursor = new Date(`${range.from}T00:00:00Z`);
  const last = new Date(`${range.to}T00:00:00Z`);
  while (cursor <= last) {
    const day = cursor.toISOString().slice(0, 10);
    dailyRows.push({ period: day, service: serviceByDay.get(day) || 0, events: eventsByDay.get(day) || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const buckets = fillBuckets(range.from, range.to, dailyRows, bucket, ["service", "events"]);
  return {
    range: { from: range.from, to: range.to },
    period: { preset: period, bucket },
    scope: "Assigned team members only; team membership is evaluated from current assignments.",
    attendance: {
      service_checkins: serviceRows.reduce((sum, row) => sum + asNumber(row.total), 0),
      event_checkins: eventRows.reduce((sum, row) => sum + asNumber(row.total), 0),
      buckets,
    },
  };
};
