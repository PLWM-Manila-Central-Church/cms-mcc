"use strict";

const { Op, QueryTypes, fn, col, literal } = require("sequelize");
const sequelize = require("../config/db");
const { Member, FinancialRecord, Attendance } = require("../models");
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

exports.getAnalytics = async ({ user, date_from, date_to, period = "year" } = {}) => {
  if (!REPORT_ROLES.has(user?.roleName)) throw AppError.forbidden("This role cannot view consolidated analytics");
  const range = parseDateRange({ date_from, date_to });
  const bucket = granularityFor(period, range);
  const demographicsAsOfDate = manilaToday();
  const canSeeMembers = ["System Admin", "Pastor", "Registration Team"].includes(user.roleName);
  const canSeeAttendance = ["System Admin", "Pastor", "Registration Team"].includes(user.roleName);
  const canSeeFinance = ["System Admin", "Pastor", "Finance Team"].includes(user.roleName);
  const result = {
    range: { from: range.from, to: range.to },
    period: { preset: period, bucket },
    members: null,
    demographics: null,
    member_growth: null,
    attendance: null,
    finance: null,
  };

  const memberTask = canSeeMembers ? (async () => {
    const [active, inactive, total, ageBands, gender, cellGroups, groups, cellGroupCategoryCounts, groupCategoryCounts, growthRows] = await Promise.all([
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
        SELECT DATE_FORMAT(created_at, '%Y-%m-%d') AS period, COUNT(*) AS total
        FROM members WHERE is_deleted = 0 AND created_at >= :fromDateTime AND created_at < :toExclusive
        GROUP BY period ORDER BY period`,
        { type: QueryTypes.SELECT, replacements: { fromDateTime: range.fromDateTime, toExclusive: range.toExclusive } },
      ),
    ]);
    return {
      members: { total, active, inactive, new_in_range: growthRows.reduce((sum, row) => sum + asNumber(row.total), 0) },
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
    return {
      service_checkins: serviceCheckins,
      event_checkins: eventCheckins,
      buckets: attendanceBuckets,
      monthly: attendanceBuckets,
    };
  })() : Promise.resolve(null);

  const financeTask = canSeeFinance ? (async () => {
    const incomeRows = await dailyAggregate(FinancialRecord, "transaction_date", range, { is_deleted: 0 }, "amount");
    const dailyRows = incomeRows.map((row) => ({ period: String(row.period).slice(0, 10), income: asMoney(row.total) }));
    const buckets = fillBuckets(range.from, range.to, dailyRows, bucket, ["income"])
      .map((row) => ({ ...row, income: asMoney(row.income) }));
    const incomeTotal = asMoney(incomeRows.reduce((sum, row) => sum + asMoney(row.total), 0));
    return { income: incomeTotal, buckets };
  })() : Promise.resolve(null);

  const [memberData, attendance, finance] = await Promise.all([memberTask, attendanceTask, financeTask]);
  if (memberData) {
    result.members = memberData.members;
    result.demographics = memberData.demographics;
    result.member_growth = memberData.growth;
  }
  result.attendance = attendance;
  result.finance = finance;
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
