"use strict";

const { Op, QueryTypes, fn, col, literal } = require("sequelize");
const sequelize = require("../config/db");
const { Member, FinancialRecord, Expense, Attendance } = require("../models");
const { getAttendanceModel } = require("../helpers/attendanceSummary.helper");
const AppError = require("../helpers/AppError");

const REPORT_ROLES = new Set(["System Admin", "Pastor", "Registration Team", "Finance Team"]);
const asNumber = (value) => Number(value || 0);
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

const fillMonths = (from, to, rows) => {
  const values = new Map(rows.map((row) => [row.period, asNumber(row.total)]));
  const cursor = new Date(`${from.slice(0, 7)}-01T00:00:00Z`);
  const last = new Date(`${to.slice(0, 7)}-01T00:00:00Z`);
  const result = [];
  while (cursor <= last) {
    const period = cursor.toISOString().slice(0, 7);
    result.push({ period, total: values.get(period) || 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return result;
};

const monthlyCounts = async (Model, dateColumn, range, extraWhere = {}) => {
  const periodExpression = fn("DATE_FORMAT", col(dateColumn), "%Y-%m");
  return Model.findAll({
    attributes: [[periodExpression, "period"], [fn("COUNT", col("id")), "total"]],
    where: { ...extraWhere, [dateColumn]: { [Op.between]: [range.fromDateTime, range.throughDateTime] } },
    group: [periodExpression],
    order: [[literal("period"), "ASC"]],
    raw: true,
  });
};

exports.getAnalytics = async ({ user, date_from, date_to } = {}) => {
  if (!REPORT_ROLES.has(user?.roleName)) throw AppError.forbidden("This role cannot view consolidated analytics");
  const range = parseDateRange({ date_from, date_to });
  const canSeeMembers = ["System Admin", "Pastor", "Registration Team"].includes(user.roleName);
  const canSeeAttendance = ["System Admin", "Pastor", "Registration Team"].includes(user.roleName);
  const canSeeFinance = ["System Admin", "Pastor", "Finance Team"].includes(user.roleName);
  const result = { range: { from: range.from, to: range.to }, members: null, demographics: null, member_growth: null, attendance: null, finance: null };

  const memberTask = canSeeMembers ? (async () => {
    const [active, inactive, total, ageBands, gender, cellGroups, groups, growthRows] = await Promise.all([
      Member.count({ where: { status: "Active" } }),
      Member.count({ where: { status: "Inactive" } }),
      Member.count(),
      sequelize.query(`
        SELECT CASE
          WHEN birthdate IS NULL OR birthdate > CURDATE() THEN 'Unknown'
          WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) < 18 THEN '0-17'
          WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) < 30 THEN '18-29'
          WHEN TIMESTAMPDIFF(YEAR, birthdate, CURDATE()) < 50 THEN '30-49'
          ELSE '50+'
        END AS label, COUNT(*) AS total
        FROM members WHERE is_deleted = 0 GROUP BY label ORDER BY label`,
        { type: QueryTypes.SELECT },
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
        SELECT DATE_FORMAT(created_at, '%Y-%m') AS period, COUNT(*) AS total
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
        cell_groups: cellGroups.map((row) => ({ id: row.id, label: row.label, total: asNumber(row.total) })),
        groups: groups.map((row) => ({ id: row.id, label: row.label, total: asNumber(row.total) })),
      },
      growth: fillMonths(range.from, range.to, growthRows),
    };
  })() : Promise.resolve(null);

  const attendanceTask = canSeeAttendance ? (async () => {
    const AttendanceModel = await getAttendanceModel();
    const serviceRows = await monthlyCounts(AttendanceModel, "checked_in_at", range, {
      check_in_method: { [Op.ne]: "pre-reg" },
      ...(AttendanceModel !== Attendance && { voided_at: null }),
    });
    let eventRows = [];
    try {
      const { getQrSchemaReadiness } = require("../modules/qr-attendance/featureSettings");
      if ((await getQrSchemaReadiness()).ready) {
        const { EventAttendance } = require("../modules/qr-attendance/models");
        eventRows = await monthlyCounts(EventAttendance, "checked_in_at", range, { voided_at: null });
      }
    } catch {
      // Event QR attendance is optional on older/local schemas.
    }
    const serviceMonthly = fillMonths(range.from, range.to, serviceRows);
    const eventMonthly = fillMonths(range.from, range.to, eventRows);
    const eventsByMonth = new Map(eventMonthly.map((row) => [row.period, row.total]));
    return {
      service_checkins: serviceMonthly.reduce((sum, row) => sum + row.total, 0),
      event_checkins: eventMonthly.reduce((sum, row) => sum + row.total, 0),
      monthly: serviceMonthly.map((row) => ({ period: row.period, service: row.total, events: eventsByMonth.get(row.period) || 0 })),
    };
  })() : Promise.resolve(null);

  const financeTask = canSeeFinance ? (async () => {
    const [income, expenses] = await Promise.all([
      FinancialRecord.sum("amount", { where: { transaction_date: { [Op.between]: [range.from, range.to] }, is_deleted: 0 } }),
      Expense.sum("amount", { where: { date: { [Op.between]: [range.from, range.to] } } }),
    ]);
    const incomeTotal = asNumber(income);
    const expenseTotal = asNumber(expenses);
    return { income: incomeTotal, expenses: expenseTotal, net: incomeTotal - expenseTotal };
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
