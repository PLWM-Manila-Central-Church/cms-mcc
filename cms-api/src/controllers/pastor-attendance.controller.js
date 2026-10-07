"use strict";

const pastorAttendanceService = require("../services/pastor-attendance.service");

const csvCell = (value) => {
  let text = value == null ? "" : String(value);
  if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
};

const COLUMNS = [
  ["row_type", "Row type"],
  ["filter_from", "Filter from"],
  ["filter_to", "Filter to"],
  ["filter_activity_type", "Activity filter"],
  ["filter_activity_id", "Activity ID filter"],
  ["filter_session_id", "Session filter"],
  ["filter_mode", "Mode"],
  ["time_zone", "Time zone"],
  ["session_id", "Session ID"],
  ["target_type", "Activity type"],
  ["target_id", "Activity ID"],
  ["activity_title", "Activity"],
  ["session_title", "Session"],
  ["activity_date", "Activity date"],
  ["starts_at", "Session start"],
  ["session_status", "Session status"],
  ["expected_basis", "Expected basis"],
  ["expected_count", "Expected"],
  ["expected_present_count", "Expected present"],
  ["registered_count", "Registered or RSVP"],
  ["confirmed_visits", "Confirmed visits"],
  ["unique_attendees", "Unique attendees"],
  ["awaiting_review", "Awaiting review"],
  ["provisional_missing", "Provisional missing"],
  ["final_absent", "Final absent"],
  ["finalization_status", "Reconciliation status"],
  ["event_session_count", "Event sessions"],
  ["team_dimension", "Team dimension"],
  ["team_id", "Team ID"],
  ["team_name", "Team"],
  ["team_visits", "Team visits"],
  ["team_unique_members", "Team unique members"],
  ["current_membership_fallback_visits", "Legacy fallback visits"],
];

const withFilters = (row, filters) => ({
  filter_from: filters.from,
  filter_to: filters.to,
  filter_activity_type: filters.activity_type,
  filter_activity_id: filters.activity_id,
  filter_session_id: filters.session_id,
  filter_mode: filters.mode,
  time_zone: filters.time_zone,
  ...row,
});

exports.getReport = async (req, res, next) => {
  try {
    const data = await pastorAttendanceService.getPastorAttendanceReport(req.query, req.user);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.searchMembers = async (req, res, next) => {
  try {
    const data = await pastorAttendanceService.searchPastorMembers(req.query, req.user);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.getMemberHistory = async (req, res, next) => {
  try {
    const data = await pastorAttendanceService.getPastorMemberHistory(req.params.memberId, req.query, req.user);
    res.json({ success: true, data });
  } catch (error) { next(error); }
};

exports.exportReport = async (req, res, next) => {
  try {
    const report = await pastorAttendanceService.getPastorAttendanceReport(req.query, req.user, { exportAll: true });
    const rows = [
      withFilters({
        row_type: "filtered_total",
        target_type: "all",
        activity_title: "Filtered attendance totals",
        confirmed_visits: report.summary.confirmed_visits,
        unique_attendees: report.summary.unique_attendees,
        expected_count: report.summary.expected_visits,
        expected_present_count: report.summary.expected_present,
        awaiting_review: report.summary.awaiting_review,
        provisional_missing: report.summary.provisional_missing,
        final_absent: report.summary.final_absent,
        finalization_status: `${report.summary.finalized_sessions} finalized sessions`,
      }, report.filters),
      ...report.event_activity_summary.map((event) => withFilters({
        row_type: "event_total",
        target_type: "event",
        target_id: event.event_id,
        activity_title: event.title,
        activity_date: event.start_date,
        confirmed_visits: event.session_visits,
        unique_attendees: event.unique_participants,
        registered_count: event.registered_count,
        event_session_count: event.qr_session_count,
      }, report.filters)),
      ...report.team_breakdown.cell_groups.map((team) => withFilters({
        row_type: "team_total",
        team_dimension: "cell_group",
        team_id: team.id,
        team_name: team.name,
        team_visits: team.visits,
        team_unique_members: team.unique_members,
        current_membership_fallback_visits: team.current_membership_fallback_visits,
      }, report.filters)),
      ...report.team_breakdown.groups.map((team) => withFilters({
        row_type: "team_total",
        team_dimension: "group",
        team_id: team.id,
        team_name: team.name,
        team_visits: team.visits,
        team_unique_members: team.unique_members,
        current_membership_fallback_visits: team.current_membership_fallback_visits,
      }, report.filters)),
      ...report.sessions.map((session) => withFilters({ row_type: "session", ...session }, report.filters)),
    ];
    const lines = [
      COLUMNS.map(([, heading]) => csvCell(heading)).join(","),
      ...rows.map((row) => COLUMNS.map(([key]) => csvCell(row[key])).join(",")),
    ];
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="pastor-attendance-${report.filters.from}-to-${report.filters.to}.csv"`,
      "Cache-Control": "no-store",
    });
    res.send(`\uFEFF${lines.join("\r\n")}`);
  } catch (error) { next(error); }
};
