"use strict";

const { Op } = require("sequelize");
const AppError = require("../helpers/AppError");
const { isGlobalMemberReader } = require("../helpers/scopedLeader.helper");
const sequelize = require("../config/db");
const { CellGroup, Event, EventRegistration, Group, Member, Service, ServiceResponse } = require("../models");
const { getQrSchemaReadiness } = require("../modules/qr-attendance/featureSettings");
const {
  EventAttendance,
  QrAttendanceSession,
  QrServiceAttendance,
} = require("../modules/qr-attendance/models");

const REPORT_MAX_SESSIONS = 10_000;
const REPORT_MAX_EXPORT_ROWS = 10_000;
const REPORT_TIME_ZONE = "Asia/Manila";

const pad2 = (value) => String(value).padStart(2, "0");

const dateInManila = (date) => new Date(`${date}T00:00:00+08:00`);

const dateFromManila = (date) => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: REPORT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${pad2(values.month)}-${pad2(values.day)}`;
};

const addDays = (date, count) => {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + count);
  return result.toISOString().slice(0, 10);
};

const readRange = ({ from, to }) => {
  const today = dateFromManila(new Date());
  const toDate = to || today;
  const fromDate = from || addDays(toDate, -29);
  if (fromDate > toDate) {
    throw AppError.badRequest("INVALID_REPORT_RANGE", "The report start date must be on or before its end date");
  }
  return {
    from: fromDate,
    to: toDate,
    start: dateInManila(fromDate),
    endExclusive: dateInManila(addDays(toDate, 1)),
    time_zone: REPORT_TIME_ZONE,
  };
};

const buildSessionWhere = (filters, range) => {
  const clauses = [
    "COALESCE(sv.service_date, ev.start_date) >= :rangeFrom",
    "COALESCE(sv.service_date, ev.start_date) <= :rangeTo",
  ];
  const replacements = { rangeFrom: range.from, rangeTo: range.to };
  if (filters.activity_type === "service") clauses.push("s.service_id IS NOT NULL");
  if (filters.activity_type === "event") clauses.push("s.event_id IS NOT NULL");
  if (filters.activity_id) {
    const targetColumn = filters.activity_type === "event" ? "s.event_id" : "s.service_id";
    clauses.push(`${targetColumn} = :activityId`);
    replacements.activityId = Number(filters.activity_id);
  }
  if (filters.session_id) {
    clauses.push("s.id = :sessionId");
    replacements.sessionId = Number(filters.session_id);
  }
  if (filters.mode === "active") clauses.push("s.status IN ('draft', 'open')");
  if (filters.mode === "history") clauses.push("s.status IN ('closed', 'cancelled')");
  return { sql: clauses.join(" AND "), replacements };
};

const runSelect = async (sql, replacements) => sequelize.query(sql, {
  replacements,
  type: sequelize.QueryTypes.SELECT,
});

const countValue = (row, key) => Number(row?.[key] || 0);

const byNumber = (rows, key, readValue) => new Map(rows.map((row) => [Number(row[key]), readValue(row)]));

const ensureReportReader = (user = {}) => {
  if (!isGlobalMemberReader(user)) {
    throw AppError.forbidden("Pastor attendance reporting is available to church-wide read roles only");
  }
};

const searchPastorMembers = async ({ search, limit = 10 } = {}, user = {}) => {
  ensureReportReader(user);
  const value = String(search || "").trim();
  if (value.length < 2) return [];
  const pattern = `%${value}%`;
  const members = await Member.findAll({
    where: {
      is_deleted: 0,
      [Op.or]: [
        { first_name: { [Op.like]: pattern } },
        { last_name: { [Op.like]: pattern } },
      ],
    },
    attributes: ["id", "first_name", "last_name", "status"],
    order: [["last_name", "ASC"], ["first_name", "ASC"], ["id", "ASC"]],
    limit: Math.min(Math.max(Number(limit) || 10, 1), 20),
  });
  return members.map((member) => ({
    id: Number(member.id),
    first_name: member.first_name,
    last_name: member.last_name,
    status: member.status,
  }));
};

const buildPastorMemberHistoryUnion = ({ memberId, filters, range }) => {
  const branches = [];
  const replacements = { memberId: Number(memberId) };
  if (range.start) replacements.rangeStart = range.start;
  if (range.endExclusive) replacements.rangeEnd = range.endExclusive;
  const dateCondition = range.start && range.endExclusive
    ? "AND a.checked_in_at >= :rangeStart AND a.checked_in_at < :rangeEnd"
    : "";
  const modeCondition = filters.mode === "active"
    ? "AND a.voided_at IS NULL"
    : filters.mode === "history" ? "AND a.voided_at IS NOT NULL" : "";

  if (filters.activity_type !== "event") {
    branches.push(`
      SELECT a.id AS attendance_id, 'service' AS activity_type,
        a.service_id AS activity_id, service.title AS activity_title,
        service.service_date AS activity_date, a.checked_in_at,
        COALESCE(a.confirmed_at, a.checked_in_at) AS confirmed_at,
        a.check_in_method, a.entry_source, a.voided_at, a.void_reason,
        session.id AS session_id, session.title AS session_title
      FROM attendances a
      JOIN services service ON service.id = a.service_id
      LEFT JOIN attendance_sessions session ON session.service_id = a.service_id
      WHERE a.member_id = :memberId
        AND a.check_in_method <> 'pre-reg'
        ${dateCondition} ${modeCondition}
    `);
  }
  if (filters.activity_type !== "service") {
    branches.push(`
      SELECT a.id AS attendance_id, 'event' AS activity_type,
        session.event_id AS activity_id, event.title AS activity_title,
        event.start_date AS activity_date, a.checked_in_at,
        a.confirmed_at, a.check_in_method, a.entry_source, a.voided_at,
        a.void_reason, session.id AS session_id, session.title AS session_title
      FROM event_attendances a
      JOIN attendance_sessions session ON session.id = a.session_id
      JOIN events event ON event.id = session.event_id
      WHERE a.member_id = :memberId
        ${dateCondition} ${modeCondition}
    `);
  }
  return { sql: branches.join(" UNION ALL "), replacements };
};

const getPastorMemberHistory = async (memberId, filters = {}, user = {}) => {
  ensureReportReader(user);
  const readiness = await getQrSchemaReadiness();
  if (!readiness.ready) {
    throw AppError.conflict("QR_REPORT_NOT_READY", "QR attendance history is not ready on this database yet");
  }
  const member = await Member.findOne({
    where: { id: Number(memberId), is_deleted: 0 },
    attributes: ["id", "first_name", "last_name", "status"],
  });
  if (!member) throw AppError.notFound("MEMBER_NOT_FOUND", "Member was not found");

  const range = filters.from || filters.to
    ? readRange({ from: filters.from, to: filters.to })
    : { start: null, endExclusive: null, from: null, to: null, time_zone: REPORT_TIME_ZONE };
  const { sql, replacements } = buildPastorMemberHistoryUnion({ memberId, filters, range });
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 25, 1), 100);
  const [countRows, historyRows] = await Promise.all([
    runSelect(`SELECT COUNT(*) AS total FROM (${sql}) member_history`, replacements),
    runSelect(`SELECT * FROM (${sql}) member_history ORDER BY checked_in_at DESC, attendance_id DESC LIMIT :limit OFFSET :offset`, {
      ...replacements,
      limit,
      offset: (page - 1) * limit,
    }),
  ]);
  const total = countValue(countRows[0], "total");
  return {
    member: {
      id: Number(member.id),
      first_name: member.first_name,
      last_name: member.last_name,
      status: member.status,
    },
    records: historyRows.map((row) => ({
      attendance_id: Number(row.attendance_id),
      activity_type: row.activity_type,
      activity_id: Number(row.activity_id),
      activity_title: row.activity_title,
      activity_date: row.activity_date,
      session_id: row.session_id == null ? null : Number(row.session_id),
      session_title: row.session_title || null,
      checked_in_at: row.checked_in_at,
      confirmed_at: row.confirmed_at,
      check_in_method: row.check_in_method,
      entry_source: row.entry_source,
      status: row.voided_at ? "voided" : row.entry_source === "leader_batch" ? "leader_batch_confirmed" : "confirmed",
      voided_at: row.voided_at,
      void_reason: row.void_reason || null,
    })),
    pagination: { total, page, limit, total_pages: Math.ceil(total / limit) },
    filters: { from: range.from, to: range.to, activity_type: filters.activity_type || "all", mode: filters.mode || "all", time_zone: REPORT_TIME_ZONE },
  };
};

const loadConfirmedByActivity = async (serviceIds, eventSessionIds) => {
  const services = serviceIds.length ? await runSelect(`
    SELECT a.service_id AS target_id, COUNT(a.id) AS visits,
      COUNT(DISTINCT a.member_id) AS unique_members
    FROM attendances a
    WHERE a.service_id IN (:serviceIds)
      AND a.check_in_method <> 'pre-reg' AND a.voided_at IS NULL
    GROUP BY a.service_id
  `, { serviceIds }) : [];
  const events = eventSessionIds.length ? await runSelect(`
    SELECT s.id AS session_id, COUNT(a.id) AS visits,
      COUNT(DISTINCT a.member_id) AS unique_members
    FROM attendance_sessions s
    JOIN event_attendances a ON a.session_id = s.id AND a.voided_at IS NULL
    WHERE s.id IN (:eventSessionIds) AND s.event_id IS NOT NULL
    GROUP BY s.id
  `, { eventSessionIds }) : [];
  return [
    ...services.map((row) => ({ ...row, activity_type: "service" })),
    ...events.map((row) => ({ ...row, activity_type: "event" })),
  ];
};

const loadExpectedBySession = async (sessionIds) => {
  if (!sessionIds.length) return [];
  return runSelect(`
    SELECT expected.session_id, COUNT(DISTINCT expected.member_id) AS expected_count
    FROM attendance_expected_members expected
    JOIN attendance_sessions s ON s.id = expected.session_id
    WHERE expected.session_id IN (:sessionIds) AND s.expected_basis <> 'none'
    GROUP BY expected.session_id
  `, { sessionIds });
};

const loadConfirmedExpectedBySession = async (sessionIds) => {
  if (!sessionIds.length) return [];
  const services = await runSelect(`
    SELECT s.id AS session_id, COUNT(DISTINCT expected.member_id) AS confirmed_expected_count
    FROM attendance_sessions s
    JOIN attendance_expected_members expected ON expected.session_id = s.id
    JOIN attendances a ON a.service_id = s.service_id
      AND a.member_id = expected.member_id
      AND a.check_in_method <> 'pre-reg'
      AND a.voided_at IS NULL
    WHERE s.id IN (:sessionIds) AND s.service_id IS NOT NULL
    GROUP BY s.id
  `, { sessionIds });
  const events = await runSelect(`
    SELECT s.id AS session_id, COUNT(DISTINCT expected.member_id) AS confirmed_expected_count
    FROM attendance_sessions s
    JOIN attendance_expected_members expected ON expected.session_id = s.id
    JOIN event_attendances a ON a.session_id = s.id
      AND a.member_id = expected.member_id
      AND a.voided_at IS NULL
    WHERE s.id IN (:sessionIds) AND s.event_id IS NOT NULL
    GROUP BY s.id
  `, { sessionIds });
  return [...services, ...events];
};

const loadPendingBySession = async (sessionIds) => {
  if (!sessionIds.length) return [];
  return runSelect(`
    SELECT b.session_id,
      COUNT(DISTINCT item.member_id) AS pending_members_count,
      COUNT(DISTINCT b.id) AS pending_batches_count,
      MIN(b.submitted_at) AS oldest_pending_at
    FROM attendance_batches b
    JOIN attendance_batch_items item ON item.batch_id = b.id AND item.outcome = 'pending'
    JOIN attendance_sessions s ON s.id = b.session_id
    WHERE b.session_id IN (:sessionIds)
      AND b.state = 'submitted'
      AND (
        (s.service_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM attendances a
          WHERE a.service_id = s.service_id
            AND a.member_id = item.member_id
            AND a.check_in_method <> 'pre-reg'
            AND a.voided_at IS NULL
        ))
        OR
        (s.event_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM event_attendances a
          WHERE a.session_id = s.id
            AND a.member_id = item.member_id
            AND a.voided_at IS NULL
        ))
      )
    GROUP BY b.session_id
  `, { sessionIds });
};

const loadReviewQueueBySession = async (sessionIds) => {
  if (!sessionIds.length) return [];
  return runSelect(`
    SELECT session_id,
      COUNT(DISTINCT id) AS submitted_batches_count,
      MIN(submitted_at) AS oldest_submitted_at
    FROM attendance_batches
    WHERE session_id IN (:sessionIds) AND state = 'submitted'
    GROUP BY session_id
  `, { sessionIds });
};

const loadPendingExpectedBySession = async (sessionIds) => {
  if (!sessionIds.length) return [];
  return runSelect(`
    SELECT s.id AS session_id, COUNT(DISTINCT expected.member_id) AS pending_expected_count
    FROM attendance_sessions s
    JOIN attendance_expected_members expected ON expected.session_id = s.id
    JOIN attendance_batches b ON b.session_id = s.id AND b.state = 'submitted'
    JOIN attendance_batch_items item ON item.batch_id = b.id
      AND item.member_id = expected.member_id
      AND item.outcome = 'pending'
    WHERE s.id IN (:sessionIds)
      AND (
        (s.service_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM attendances a
          WHERE a.service_id = s.service_id
            AND a.member_id = expected.member_id
            AND a.check_in_method <> 'pre-reg'
            AND a.voided_at IS NULL
        ))
        OR
        (s.event_id IS NOT NULL AND NOT EXISTS (
          SELECT 1 FROM event_attendances a
          WHERE a.session_id = s.id
            AND a.member_id = expected.member_id
            AND a.voided_at IS NULL
        ))
      )
    GROUP BY s.id
  `, { sessionIds });
};

const loadUniqueAttendeeCount = async (serviceIds, eventSessionIds) => {
  if (!serviceIds.length && !eventSessionIds.length) return 0;
  const selects = [];
  if (serviceIds.length) {
    selects.push(`
      SELECT a.member_id FROM attendances a
      WHERE a.service_id IN (:serviceIds)
        AND a.check_in_method <> 'pre-reg' AND a.voided_at IS NULL
    `);
  }
  if (eventSessionIds.length) {
    selects.push(`
      SELECT a.member_id FROM attendance_sessions s
      JOIN event_attendances a ON a.session_id = s.id AND a.voided_at IS NULL
      WHERE s.id IN (:eventSessionIds) AND s.event_id IS NOT NULL
    `);
  }
  if (!selects.length) return 0;
  const replacements = {
    ...(serviceIds.length && { serviceIds }),
    ...(eventSessionIds.length && { eventSessionIds }),
  };
  const rows = await runSelect(`
    SELECT COUNT(DISTINCT member_id) AS unique_attendees
    FROM (${selects.join(" UNION ALL ")}) attendance_union
  `, replacements);
  return countValue(rows[0], "unique_attendees");
};

const loadEventUniqueAttendeeCount = async (eventSessionIds) => {
  if (!eventSessionIds.length) return 0;
  const rows = await runSelect(`
    SELECT COUNT(DISTINCT a.member_id) AS event_unique_participants
    FROM attendance_sessions s
    JOIN event_attendances a ON a.session_id = s.id AND a.voided_at IS NULL
    WHERE s.id IN (:eventSessionIds) AND s.event_id IS NOT NULL
  `, { eventSessionIds });
  return countValue(rows[0], "event_unique_participants");
};

const loadEventActivityAttendance = async (eventSessionIds) => {
  if (!eventSessionIds.length) return [];
  return runSelect(`
    SELECT s.event_id,
      COUNT(a.id) AS session_visits,
      COUNT(DISTINCT a.member_id) AS unique_participants
    FROM attendance_sessions s
    JOIN event_attendances a ON a.session_id = s.id AND a.voided_at IS NULL
    WHERE s.id IN (:eventSessionIds) AND s.event_id IS NOT NULL
    GROUP BY s.event_id
  `, { eventSessionIds });
};

const loadTrends = async (serviceIds, eventSessionIds) => {
  if (!serviceIds.length && !eventSessionIds.length) return [];
  const branches = [];
  const replacements = {};
  if (serviceIds.length) {
    branches.push(`
      SELECT service.service_date AS activity_date, 'service' AS activity_type, a.member_id
      FROM services service
      JOIN attendances a ON a.service_id = service.id
        AND a.check_in_method <> 'pre-reg' AND a.voided_at IS NULL
      WHERE service.id IN (:serviceIds)
    `);
    replacements.serviceIds = serviceIds;
  }
  if (eventSessionIds.length) {
    branches.push(`
      SELECT event.start_date AS activity_date, 'event' AS activity_type, a.member_id
      FROM attendance_sessions s
      JOIN events event ON event.id = s.event_id
      JOIN event_attendances a ON a.session_id = s.id AND a.voided_at IS NULL
      WHERE s.id IN (:eventSessionIds) AND s.event_id IS NOT NULL
    `);
    replacements.eventSessionIds = eventSessionIds;
  }
  const rows = await runSelect(`
    SELECT activity_date, activity_type,
      COUNT(*) AS visits,
      COUNT(DISTINCT member_id) AS unique_members
    FROM (${branches.join(" UNION ALL ")}) attendance_rows
    GROUP BY activity_date, activity_type
    ORDER BY activity_date ASC, activity_type ASC
  `, replacements);
  const byDate = new Map();
  for (const row of rows) {
    const date = String(row.activity_date).slice(0, 10);
    const point = byDate.get(date) || {
      date,
      service_visits: 0,
      service_unique_members: 0,
      event_visits: 0,
      event_unique_members: 0,
    };
    const prefix = row.activity_type === "service" ? "service" : "event";
    point[`${prefix}_visits`] = countValue(row, "visits");
    point[`${prefix}_unique_members`] = countValue(row, "unique_members");
    byDate.set(date, point);
  }
  return [...byDate.values()];
};

const loadTeamBreakdown = async (serviceIds, eventSessionIds) => {
  if (!serviceIds.length && !eventSessionIds.length) return { cell_groups: [], groups: [] };
  const branches = [];
  const replacements = {};
  if (serviceIds.length) {
    branches.push(`
      SELECT 'cell_group' AS scope_type,
        COALESCE(a.cell_group_id_at_check_in, m.cell_group_id) AS team_id,
        a.member_id,
        CASE WHEN a.cell_group_id_at_check_in IS NULL AND m.cell_group_id IS NOT NULL THEN 1 ELSE 0 END AS used_current_membership
      FROM attendances a
      LEFT JOIN members m ON m.id = a.member_id
      WHERE a.service_id IN (:serviceIds) AND a.check_in_method <> 'pre-reg' AND a.voided_at IS NULL
      UNION ALL
      SELECT 'group' AS scope_type,
        COALESCE(a.group_id_at_check_in, m.group_id) AS team_id,
        a.member_id,
        CASE WHEN a.group_id_at_check_in IS NULL AND m.group_id IS NOT NULL THEN 1 ELSE 0 END AS used_current_membership
      FROM attendances a
      LEFT JOIN members m ON m.id = a.member_id
      WHERE a.service_id IN (:serviceIds) AND a.check_in_method <> 'pre-reg' AND a.voided_at IS NULL
    `);
    replacements.serviceIds = serviceIds;
  }
  if (eventSessionIds.length) {
    branches.push(`
      SELECT 'cell_group' AS scope_type,
        COALESCE(a.cell_group_id_at_check_in, m.cell_group_id) AS team_id,
        a.member_id,
        CASE WHEN a.cell_group_id_at_check_in IS NULL AND m.cell_group_id IS NOT NULL THEN 1 ELSE 0 END AS used_current_membership
      FROM event_attendances a
      JOIN attendance_sessions s ON s.id = a.session_id
      LEFT JOIN members m ON m.id = a.member_id
      WHERE a.session_id IN (:eventSessionIds) AND a.voided_at IS NULL
      UNION ALL
      SELECT 'group' AS scope_type,
        COALESCE(a.group_id_at_check_in, m.group_id) AS team_id,
        a.member_id,
        CASE WHEN a.group_id_at_check_in IS NULL AND m.group_id IS NOT NULL THEN 1 ELSE 0 END AS used_current_membership
      FROM event_attendances a
      JOIN attendance_sessions s ON s.id = a.session_id
      LEFT JOIN members m ON m.id = a.member_id
      WHERE a.session_id IN (:eventSessionIds) AND a.voided_at IS NULL
    `);
    replacements.eventSessionIds = eventSessionIds;
  }
  const rows = await runSelect(`
    SELECT team_rows.scope_type, team_rows.team_id,
      COUNT(*) AS visits,
      COUNT(DISTINCT team_rows.member_id) AS unique_members,
      SUM(team_rows.used_current_membership) AS current_membership_fallback_visits
    FROM (${branches.join(" UNION ALL ")}) team_rows
    WHERE team_rows.team_id IS NOT NULL
    GROUP BY team_rows.scope_type, team_rows.team_id
    ORDER BY unique_members DESC, visits DESC, team_id ASC
  `, replacements);

  const cellIds = [...new Set(rows.filter((row) => row.scope_type === "cell_group").map((row) => Number(row.team_id)))];
  const groupIds = [...new Set(rows.filter((row) => row.scope_type === "group").map((row) => Number(row.team_id)))];
  const [cellRows, groupRows] = await Promise.all([
    cellIds.length ? CellGroup.findAll({ where: { id: { [Op.in]: cellIds } }, attributes: ["id", "name", "area"], raw: true }) : [],
    groupIds.length ? Group.findAll({ where: { id: { [Op.in]: groupIds } }, attributes: ["id", "name"], raw: true }) : [],
  ]);
  const cellNames = new Map(cellRows.map((row) => [Number(row.id), row]));
  const groupNames = new Map(groupRows.map((row) => [Number(row.id), row]));
  const mapRows = (scopeType, names) => rows
    .filter((row) => row.scope_type === scopeType)
    .map((row) => {
      const team = names.get(Number(row.team_id));
      return {
        id: Number(row.team_id),
        name: team?.name || "Deleted or unnamed team",
        ...(scopeType === "cell_group" && { area: team?.area || null }),
        visits: countValue(row, "visits"),
        unique_members: countValue(row, "unique_members"),
        current_membership_fallback_visits: countValue(row, "current_membership_fallback_visits"),
      };
    });
  return { cell_groups: mapRows("cell_group", cellNames), groups: mapRows("group", groupNames) };
};

const getRegistrationsByTarget = async (serviceIds, eventIds) => {
  const [serviceRows, eventRows] = await Promise.all([
    serviceIds.length ? ServiceResponse.findAll({
      where: { service_id: { [Op.in]: serviceIds }, attendance_status: "ATTENDING" },
      attributes: ["service_id", [sequelize.fn("COUNT", sequelize.fn("DISTINCT", sequelize.col("member_id"))), "registered_count"]],
      group: ["service_id"],
      raw: true,
    }) : [],
    eventIds.length ? EventRegistration.findAll({
      where: { event_id: { [Op.in]: eventIds } },
      attributes: ["event_id", [sequelize.fn("COUNT", sequelize.fn("DISTINCT", sequelize.col("member_id"))), "registered_count"]],
      group: ["event_id"],
      raw: true,
    }) : [],
  ]);

  return {
    services: byNumber(serviceRows, "service_id", (row) => countValue(row, "registered_count")),
    events: byNumber(eventRows, "event_id", (row) => countValue(row, "registered_count")),
  };
};

const loadLegacyActivities = async (filters, range) => {
  if (filters.session_id) return { services: [], events: [] };
  const services = [];
  const events = [];
  if (filters.activity_type !== "event") {
    const clauses = [
      "service.service_date >= :rangeFrom",
      "service.service_date <= :rangeTo",
      "NOT EXISTS (SELECT 1 FROM attendance_sessions session WHERE session.service_id = service.id)",
    ];
    const replacements = { rangeFrom: range.from, rangeTo: range.to };
    if (filters.activity_id) {
      clauses.push("service.id = :activityId");
      replacements.activityId = Number(filters.activity_id);
    }
    if (filters.mode === "active") clauses.push("LOWER(service.status) IN ('draft', 'published')");
    if (filters.mode === "history") clauses.push("LOWER(service.status) IN ('completed', 'cancelled')");
    services.push(...await runSelect(`
      SELECT service.id, service.title, service.service_date, service.service_time,
        service.capacity, service.status
      FROM services service
      WHERE ${clauses.join(" AND ")}
      ORDER BY service.service_date DESC, service.service_time DESC, service.id DESC
      LIMIT :rowLimit
    `, { ...replacements, rowLimit: REPORT_MAX_SESSIONS + 1 }));
  }
  if (filters.activity_type !== "service") {
    const clauses = [
      "event.is_deleted = 0",
      "event.start_date >= :rangeFrom",
      "event.start_date <= :rangeTo",
      "NOT EXISTS (SELECT 1 FROM attendance_sessions session WHERE session.event_id = event.id)",
    ];
    const replacements = { rangeFrom: range.from, rangeTo: range.to };
    if (filters.activity_id) {
      clauses.push("event.id = :activityId");
      replacements.activityId = Number(filters.activity_id);
    }
    if (filters.mode === "active") clauses.push("LOWER(event.status) IN ('upcoming', 'ongoing', 'published')");
    if (filters.mode === "history") clauses.push("LOWER(event.status) IN ('completed', 'cancelled')");
    events.push(...await runSelect(`
      SELECT event.id, event.title, event.start_date, event.end_date,
        event.start_time, event.capacity, event.status
      FROM events event
      WHERE ${clauses.join(" AND ")}
      ORDER BY event.start_date DESC, event.start_time DESC, event.id DESC
      LIMIT :rowLimit
    `, { ...replacements, rowLimit: REPORT_MAX_SESSIONS + 1 }));
  }
  return { services, events };
};

const getPastorAttendanceReport = async (filters = {}, user = {}, { exportAll = false } = {}) => {
  ensureReportReader(user);
  const readiness = await getQrSchemaReadiness();
  if (!readiness.ready) {
    throw AppError.conflict("QR_REPORT_NOT_READY", "QR attendance reporting is not ready on this database yet");
  }

  const range = readRange(filters);
  const sessionFilter = buildSessionWhere(filters, range);
  const selectedSessions = await runSelect(`
    SELECT s.id, s.service_id, s.event_id, s.session_key, s.title, s.starts_at, s.ends_at,
      s.check_in_opens_at, s.check_in_closes_at, s.approval_deadline, s.time_zone, s.status,
      s.expected_basis, s.expected_roster_frozen_at, s.activity_revision, s.finalized_at,
      s.finalized_by, s.finalized_revision
    FROM attendance_sessions s
    LEFT JOIN services sv ON sv.id = s.service_id
    LEFT JOIN events ev ON ev.id = s.event_id
    WHERE ${sessionFilter.sql}
    ORDER BY s.starts_at DESC, s.id DESC
    LIMIT :sessionLimit
  `, { ...sessionFilter.replacements, sessionLimit: REPORT_MAX_SESSIONS + 1 });
  if (selectedSessions.length > REPORT_MAX_SESSIONS) {
    throw AppError.conflict("PASTOR_REPORT_RANGE_TOO_LARGE", "Narrow the date range to 10,000 attendance sessions or fewer");
  }

  const legacyActivities = await loadLegacyActivities(filters, range);
  if (selectedSessions.length + legacyActivities.services.length + legacyActivities.events.length > REPORT_MAX_SESSIONS) {
    throw AppError.conflict("PASTOR_REPORT_RANGE_TOO_LARGE", "Narrow the date range to 10,000 activities or fewer");
  }

  const sessionIds = selectedSessions.map((session) => Number(session.id));
  const qrServiceIds = [...new Set(selectedSessions.map((session) => Number(session.service_id)).filter(Boolean))];
  const qrEventIds = [...new Set(selectedSessions.map((session) => Number(session.event_id)).filter(Boolean))];
  const serviceIds = [...new Set([
    ...qrServiceIds,
    ...legacyActivities.services.map((service) => Number(service.id)),
  ])];
  const eventIds = [...new Set([
    ...qrEventIds,
    ...legacyActivities.events.map((event) => Number(event.id)),
  ])];
  const [serviceRows, eventRows, confirmedRows, expectedRows, confirmedExpectedRows, pendingRows, reviewQueueRows, pendingExpectedRows, uniqueAttendees, eventUniqueAttendees, eventActivityRows, trends, teamBreakdown, registrations] = await Promise.all([
    serviceIds.length ? Service.findAll({ where: { id: { [Op.in]: serviceIds } }, attributes: ["id", "title", "service_date", "service_time", "capacity", "status"], raw: true }) : [],
    eventIds.length ? Event.findAll({ where: { id: { [Op.in]: eventIds } }, attributes: ["id", "title", "start_date", "end_date", "start_time", "capacity", "status"], raw: true }) : [],
    loadConfirmedByActivity(serviceIds, sessionIds),
    loadExpectedBySession(sessionIds),
    loadConfirmedExpectedBySession(sessionIds),
    loadPendingBySession(sessionIds),
    loadReviewQueueBySession(sessionIds),
    loadPendingExpectedBySession(sessionIds),
    loadUniqueAttendeeCount(serviceIds, sessionIds),
    loadEventUniqueAttendeeCount(sessionIds),
    loadEventActivityAttendance(sessionIds),
    loadTrends(serviceIds, sessionIds),
    loadTeamBreakdown(serviceIds, sessionIds),
    getRegistrationsByTarget(serviceIds, eventIds),
  ]);

  const services = new Map(serviceRows.map((row) => [Number(row.id), row]));
  const events = new Map(eventRows.map((row) => [Number(row.id), row]));
  const eventSessionCountById = new Map();
  for (const session of selectedSessions) {
    if (!session.event_id) continue;
    const eventId = Number(session.event_id);
    eventSessionCountById.set(eventId, (eventSessionCountById.get(eventId) || 0) + 1);
  }
  const eventAttendanceById = byNumber(eventActivityRows, "event_id", (row) => ({
    session_visits: countValue(row, "session_visits"),
    unique_participants: countValue(row, "unique_participants"),
  }));
  const confirmedByService = byNumber(confirmedRows.filter((row) => row.activity_type === "service"), "target_id", (row) => ({
    visits: countValue(row, "visits"), unique_members: countValue(row, "unique_members"),
  }));
  const confirmedByEventSession = byNumber(confirmedRows.filter((row) => row.activity_type === "event"), "session_id", (row) => ({
    visits: countValue(row, "visits"), unique_members: countValue(row, "unique_members"),
  }));
  const expectedBySession = byNumber(expectedRows, "session_id", (row) => countValue(row, "expected_count"));
  const confirmedExpectedBySession = byNumber(confirmedExpectedRows, "session_id", (row) => countValue(row, "confirmed_expected_count"));
  const pendingBySession = byNumber(pendingRows, "session_id", (row) => ({
    members: countValue(row, "pending_members_count"),
  }));
  const reviewQueueBySession = byNumber(reviewQueueRows, "session_id", (row) => ({
    batches: countValue(row, "submitted_batches_count"),
    oldest: row.oldest_submitted_at || null,
  }));
  const pendingExpectedBySession = byNumber(pendingExpectedRows, "session_id", (row) => countValue(row, "pending_expected_count"));
  const now = Date.now();

  const items = selectedSessions.map((session) => {
    const id = Number(session.id);
    const isService = Boolean(session.service_id);
    const targetId = Number(session.service_id || session.event_id);
    const activity = isService ? services.get(targetId) : events.get(targetId);
    const expectedCount = session.expected_basis === "none" ? null : expectedBySession.get(id) || 0;
    const expectedPresent = confirmedExpectedBySession.get(id) || 0;
    const pending = pendingBySession.get(id) || { members: 0 };
    const reviewQueue = reviewQueueBySession.get(id) || { batches: 0, oldest: null };
    const finalized = Boolean(session.finalized_at && Number(session.finalized_revision) === Number(session.activity_revision || 1));
    const closedForReconciliation = session.status === "closed"
      || (session.status === "open" && now >= new Date(session.check_in_closes_at).getTime());
    const provisionalMissing = expectedCount === null || !closedForReconciliation || finalized
      ? null
      : Math.max(0, expectedCount - expectedPresent - (pendingExpectedBySession.get(id) || 0));
    const finalAbsent = expectedCount === null || !finalized ? null : Math.max(0, expectedCount - expectedPresent);
    const counts = isService
      ? confirmedByService.get(targetId) || { visits: 0, unique_members: 0 }
      : confirmedByEventSession.get(id) || { visits: 0, unique_members: 0 };
    return {
      session_id: id,
      session_key: session.session_key,
      session_title: session.title,
      target_type: isService ? "service" : "event",
      target_id: targetId,
      activity_title: activity?.title || session.title,
      activity_date: isService ? activity?.service_date || null : activity?.start_date || null,
      activity_status: activity?.status || null,
      session_status: session.status,
      starts_at: session.starts_at,
      ends_at: session.ends_at,
      check_in_closes_at: session.check_in_closes_at,
      time_zone: session.time_zone || REPORT_TIME_ZONE,
      expected_basis: session.expected_basis,
      expected_count: expectedCount,
      expected_present_count: expectedCount === null ? null : expectedPresent,
      confirmed_visits: counts.visits,
      unique_attendees: counts.unique_members,
      registered_count: isService
        ? registrations.services.get(targetId) || 0
        : registrations.events.get(targetId) || 0,
      awaiting_review: pending.members,
      submitted_batches: reviewQueue.batches,
      oldest_pending_at: reviewQueue.oldest,
      provisional_missing: provisionalMissing,
      final_absent: finalAbsent,
      finalization_status: expectedCount === null ? "unavailable" : finalized ? "finalized" : closedForReconciliation ? "provisional" : "in_progress",
      finalized_at: finalized ? session.finalized_at : null,
      finalized_by: finalized ? session.finalized_by : null,
      activity_revision: Number(session.activity_revision || 1),
      capacity: activity?.capacity ?? null,
    };
  });

  const legacyItems = [
    ...legacyActivities.services.map((service) => {
      const serviceId = Number(service.id);
      const counts = confirmedByService.get(serviceId) || { visits: 0, unique_members: 0 };
      const activity = services.get(serviceId) || service;
      const startTime = String(activity.service_time || "00:00:00").slice(0, 8);
      return {
        session_id: null,
        session_title: "Legacy Service attendance",
        target_type: "service",
        target_id: serviceId,
        activity_title: activity.title,
        activity_date: activity.service_date,
        activity_status: activity.status,
        session_status: "legacy",
        starts_at: new Date(`${activity.service_date}T${startTime}+08:00`).toISOString(),
        time_zone: REPORT_TIME_ZONE,
        expected_basis: "none",
        expected_count: null,
        expected_present_count: null,
        confirmed_visits: counts.visits,
        unique_attendees: counts.unique_members,
        registered_count: registrations.services.get(serviceId) || 0,
        awaiting_review: 0,
        submitted_batches: 0,
        oldest_pending_at: null,
        provisional_missing: null,
        final_absent: null,
        finalization_status: "no_session",
        finalized_at: null,
        finalized_by: null,
        activity_revision: null,
        capacity: activity.capacity ?? null,
      };
    }),
    ...legacyActivities.events.map((event) => {
      const eventId = Number(event.id);
      const activity = events.get(eventId) || event;
      const startTime = String(activity.start_time || "00:00:00").slice(0, 8);
      return {
        session_id: null,
        session_title: "No QR attendance session",
        target_type: "event",
        target_id: eventId,
        activity_title: activity.title,
        activity_date: activity.start_date,
        activity_status: activity.status,
        session_status: "no_session",
        starts_at: new Date(`${activity.start_date}T${startTime}+08:00`).toISOString(),
        time_zone: REPORT_TIME_ZONE,
        expected_basis: "none",
        expected_count: null,
        expected_present_count: null,
        confirmed_visits: 0,
        unique_attendees: 0,
        registered_count: registrations.events.get(eventId) || 0,
        awaiting_review: 0,
        submitted_batches: 0,
        oldest_pending_at: null,
        provisional_missing: null,
        final_absent: null,
        finalization_status: "no_session",
        finalized_at: null,
        finalized_by: null,
        activity_revision: null,
        capacity: activity.capacity ?? null,
      };
    }),
  ];
  items.push(...legacyItems);
  items.sort((left, right) => new Date(right.starts_at) - new Date(left.starts_at));

  const total = items.length;
  if (exportAll && total > REPORT_MAX_EXPORT_ROWS) {
    throw AppError.conflict("PASTOR_REPORT_EXPORT_LIMIT", `This report exceeds ${REPORT_MAX_EXPORT_ROWS} attendance sessions. Narrow the date or activity filter and export again.`);
  }
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 50);
  const reportSessions = exportAll ? items : items.slice((page - 1) * limit, page * limit);
  const expectedSessions = items.filter((item) => item.expected_count !== null);
  const finalizedSessions = items.filter((item) => item.finalization_status === "finalized");
  const provisionalSessions = items.filter((item) => item.finalization_status === "provisional");
  const oldestPending = items.map((item) => item.oldest_pending_at).filter(Boolean)
    .sort((left, right) => new Date(left) - new Date(right))[0] || null;
  const activityOptions = new Map();
  for (const item of items) {
    const key = `${item.target_type}:${item.target_id}`;
    if (!activityOptions.has(key)) {
      activityOptions.set(key, { id: item.target_id, type: item.target_type, title: item.activity_title, date: item.activity_date });
    }
  }
  const eventActivitySummary = eventIds.map((id) => {
    const event = events.get(id);
    const attendance = eventAttendanceById.get(id) || { session_visits: 0, unique_participants: 0 };
    return {
      event_id: id,
      title: event?.title || "Deleted or unnamed Event",
      start_date: event?.start_date || null,
      qr_session_count: eventSessionCountById.get(id) || 0,
      unique_participants: attendance.unique_participants,
      session_visits: attendance.session_visits,
      registered_count: registrations.events.get(id) || 0,
    };
  });

  return {
    filters: {
      from: range.from,
      to: range.to,
      activity_type: filters.activity_type || "all",
      activity_id: filters.activity_id ? Number(filters.activity_id) : null,
      session_id: filters.session_id ? Number(filters.session_id) : null,
      mode: filters.mode || "all",
      time_zone: range.time_zone,
    },
    summary: {
      service_visits: items.filter((item) => item.target_type === "service").reduce((sum, item) => sum + item.confirmed_visits, 0),
      event_session_visits: items.filter((item) => item.target_type === "event").reduce((sum, item) => sum + item.confirmed_visits, 0),
      confirmed_visits: items.reduce((sum, item) => sum + item.confirmed_visits, 0),
      unique_attendees: uniqueAttendees,
      event_unique_participants: eventUniqueAttendees,
      expected_visits: expectedSessions.reduce((sum, item) => sum + item.expected_count, 0),
      expected_sessions: expectedSessions.length,
      expected_present: expectedSessions.reduce((sum, item) => sum + item.expected_present_count, 0),
      awaiting_review: items.reduce((sum, item) => sum + item.awaiting_review, 0),
      provisional_missing: provisionalSessions.length ? provisionalSessions.reduce((sum, item) => sum + item.provisional_missing, 0) : null,
      provisional_sessions: provisionalSessions.length,
      final_absent: finalizedSessions.length ? finalizedSessions.reduce((sum, item) => sum + item.final_absent, 0) : null,
      finalized_sessions: finalizedSessions.length,
      sessions_requiring_finalization: items.filter((item) => item.finalization_status === "provisional").length,
      active_sessions: items.filter((item) => ["draft", "open"].includes(item.session_status)).length,
    },
    review_health: {
      submitted_batches: items.reduce((sum, item) => sum + item.submitted_batches, 0),
      awaiting_review: items.reduce((sum, item) => sum + item.awaiting_review, 0),
      oldest_pending_at: oldestPending,
      sessions_requiring_finalization: items.filter((item) => item.finalization_status === "provisional").length,
    },
    trends,
    event_activity_summary: eventActivitySummary,
    team_breakdown: teamBreakdown,
    activity_options: [...activityOptions.values()].slice(0, 200),
    sessions: reportSessions,
    pagination: { total, page: exportAll ? 1 : page, limit: exportAll ? total : limit, total_pages: exportAll ? 1 : Math.ceil(total / limit) },
  };
};

module.exports = {
  getPastorAttendanceReport,
  getPastorMemberHistory,
  searchPastorMembers,
  REPORT_MAX_EXPORT_ROWS,
};
