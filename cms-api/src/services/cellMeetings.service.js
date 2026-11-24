"use strict";

const { Op } = require("sequelize");
const AppError = require("../helpers/AppError");
const auditLog = require("../helpers/auditLog.helper");
const { CellGroup, CellGroupMeeting, CellGroupMeetingAttendance, Member } = require("../models");

const safeFind = (M, opts) => (M?.findAll ? M.findAll(opts).catch(() => []) : Promise.resolve([]));

exports.getCellGroupHealthAlerts = async () => {
  const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const [cells, recentMeetings] = await Promise.all([
    safeFind(CellGroup, { where: { is_deleted: 0 }, order: [["name", "ASC"]] }),
    safeFind(CellGroupMeeting, {
      where: { is_deleted: 0, meeting_date: { [Op.gte]: cutoff } },
      attributes: ["cell_group_id"],
      raw: true,
    }),
  ]);
  const activeSet = new Set(recentMeetings.map((m) => Number(m.cell_group_id)));
  const leaderless = cells.filter((c) => !c.leader_user_id).map((c) => ({ id: c.id, name: c.name, area: c.area }));
  const quiet = cells.filter((c) => !activeSet.has(Number(c.id))).map((c) => ({ id: c.id, name: c.name, area: c.area }));
  return {
    total_cell_groups: cells.length,
    leaderless_count: leaderless.length,
    quiet_30d_count: quiet.length,
    leaderless: leaderless.slice(0, 10),
    quiet_30d: quiet.slice(0, 10),
  };
};

exports.listMeetings = async (cellGroupId) => {
  return safeFind(CellGroupMeeting, {
    where: { cell_group_id: Number(cellGroupId), is_deleted: 0 },
    order: [["meeting_date", "DESC"], ["id", "DESC"]],
    limit: 50,
  });
};

exports.createMeeting = async (cellGroupId, payload, user) => {
  if (!payload.meeting_date) throw AppError.badRequest("VALIDATION_ERROR", "Meeting date is required.");
  const created = await CellGroupMeeting.create({
    cell_group_id: Number(cellGroupId),
    meeting_date: payload.meeting_date,
    meeting_time: payload.meeting_time || null,
    location: payload.location || null,
    lesson_topic: payload.lesson_topic || null,
    scripture_reference: payload.scripture_reference || null,
    prayer_notes: payload.prayer_notes || null,
    attendees_count: Number(payload.attendees_count || 0),
    visitors_count: Number(payload.visitors_count || 0),
    recorded_by: user.userId,
  });
  auditLog.log({ userId: user.userId, action: "LOG_CELL_MEETING", targetTable: "cell_group_meetings", targetId: created.id });
  return created;
};

exports.recordMeetingAttendance = async (meetingId, entries = []) => {
  const meeting = await CellGroupMeeting.findOne({ where: { id: meetingId, is_deleted: 0 } });
  if (!meeting) throw AppError.notFound("RECORD_NOT_FOUND", "Cell group meeting not found");

  let presentCount = 0;
  for (const entry of entries) {
    const memberId = Number(entry.member_id);
    if (!memberId) continue;
    const status = ["present", "absent", "excused"].includes(entry.status) ? entry.status : "present";
    const [row] = await CellGroupMeetingAttendance.findOrCreate({
      where: { meeting_id: meeting.id, member_id: memberId },
      defaults: { meeting_id: meeting.id, member_id: memberId, status },
    });
    await row.update({ status });
    if (status === "present") presentCount += 1;
  }
  await meeting.update({ attendees_count: presentCount });
  return { meeting_id: meeting.id, present_count: presentCount };
};
