"use strict";
const { readiness } = require("./readiness");
const sequelize = require("../../config/db");
const exceptionCounts = async (session, memberIds) => {
  if (!await readiness() || Array.isArray(memberIds) && !memberIds.length) return { excused: 0, pending: 0, overlap: 0 };
  const table = session.service_id ? "attendances" : "event_attendances";
  const join = session.service_id ? "a.service_id=:targetId AND a.check_in_method<>'pre-reg'" : "a.session_id=:sessionId";
  const rows = await sequelize.query("SELECT ex.status, COUNT(DISTINCT ex.member_id) AS total, " +
    "SUM(EXISTS(SELECT 1 FROM attendance_batch_items bi JOIN attendance_batches b ON b.id=bi.batch_id WHERE b.session_id=ex.session_id AND b.state='submitted' AND bi.member_id=ex.member_id AND bi.outcome='pending')) AS overlap " +
    "FROM attendance_exceptions ex " +
    "JOIN attendance_expected_members em ON em.session_id=ex.session_id AND em.member_id=ex.member_id " +
    "LEFT JOIN " + table + " a ON a.member_id=ex.member_id AND " + join + " AND a.voided_at IS NULL " +
    "WHERE ex.session_id=:sessionId AND a.id IS NULL AND ex.status IN ('excused','pending') " +
    (Array.isArray(memberIds) ? "AND ex.member_id IN (:memberIds) " : "") + "GROUP BY ex.status",
  { replacements: { sessionId: Number(session.id), targetId: Number(session.service_id || 0), memberIds }, type: sequelize.QueryTypes.SELECT });
  return { excused: Number(rows.find((row) => row.status === "excused")?.total || 0), pending: Number(rows.find((row) => row.status === "pending")?.total || 0), overlap: rows.reduce((sum, row) => sum + Number(row.overlap || 0), 0) };
};
const exceptionCountsForSessions = async (sessions) => {
  const result = new Map();
  if (!sessions.length || !await readiness()) return result;
  for (const service of [true, false]) {
    const ids = sessions.filter((session) => Boolean(session.service_id) === service).map((session) => Number(session.id));
    for (let offset = 0; offset < ids.length; offset += 1000) {
      const table = service ? "attendances" : "event_attendances";
      const join = service ? "a.service_id=s.service_id AND a.check_in_method<>'pre-reg'" : "a.session_id=s.id";
      const rows = await sequelize.query("SELECT s.id, ex.status, COUNT(DISTINCT ex.member_id) AS total, " +
        "SUM(EXISTS(SELECT 1 FROM attendance_batch_items bi JOIN attendance_batches b ON b.id=bi.batch_id WHERE b.session_id=s.id AND b.state='submitted' AND bi.member_id=ex.member_id AND bi.outcome='pending')) AS overlap " +
        "FROM attendance_sessions s JOIN attendance_exceptions ex ON ex.session_id=s.id " +
        "JOIN attendance_expected_members em ON em.session_id=s.id AND em.member_id=ex.member_id " +
        "LEFT JOIN " + table + " a ON a.member_id=ex.member_id AND " + join + " AND a.voided_at IS NULL " +
        "WHERE s.id IN (:ids) AND a.id IS NULL AND ex.status IN ('excused','pending') GROUP BY s.id, ex.status",
      { replacements: { ids: ids.slice(offset, offset + 1000) }, type: sequelize.QueryTypes.SELECT });
      for (const row of rows) {
        if (!result.has(Number(row.id))) result.set(Number(row.id), { excused: 0, pending: 0, overlap: 0 });
        const value = result.get(Number(row.id));
        value[row.status] = Number(row.total); value.overlap += Number(row.overlap || 0);
      }
    }
  }
  return result;
};
module.exports = { exceptionCounts, exceptionCountsForSessions };
