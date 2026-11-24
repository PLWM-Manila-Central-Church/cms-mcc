"use strict";

const { Op } = require("sequelize");
const AppError = require("../helpers/AppError");
const auditLog = require("../helpers/auditLog.helper");
const {
  MinistryGroup,
  MinistryActivity,
  MinistryAttendanceResponse,
  MinistryActivityAttendance,
  MinistryAnnouncement,
  MemberMessage,
  MemberFeedback,
  PastoralVisitation,
  MinistryMembership,
  MinistryRole,
  Attendance,
  Member,
  User,
} = require("../models");

const safeFind = (M, opts) => (M?.findAll ? M.findAll(opts).catch(() => []) : Promise.resolve([]));
const round1 = (v) => Math.round((Number(v) || 0) * 10) / 10;

// ── Full Ministry Engagement Workspace + 7 Ministry Reports
exports.getMinistryEngagement = async (ministryGroupId) => {
  const [activities, responses, checkins, announcements, messages, feedback, visitations, members] = await Promise.all([
    safeFind(MinistryActivity, {
      where: { ministry_group_id: ministryGroupId, is_deleted: 0 },
      order: [["activity_date", "DESC"], ["id", "DESC"]],
      limit: 50,
    }),
    safeFind(MinistryAttendanceResponse, {
      include: [{ model: Member, as: "member", attributes: ["id", "first_name", "last_name"], required: false }],
    }),
    safeFind(MinistryActivityAttendance, {}),
    safeFind(MinistryAnnouncement, {
      where: { ministry_group_id: ministryGroupId, is_deleted: 0 },
      order: [["is_pinned", "DESC"], ["created_at", "DESC"]],
      limit: 30,
    }),
    safeFind(MemberMessage, {
      where: { ministry_group_id: ministryGroupId, is_deleted: 0 },
      include: [
        { model: Member, as: "member", attributes: ["id", "first_name", "last_name"], required: false },
        { model: User, as: "sender", attributes: ["id", "email"], required: false },
      ],
      order: [["created_at", "DESC"]],
      limit: 50,
    }),
    safeFind(MemberFeedback, {
      where: { ministry_group_id: ministryGroupId, is_deleted: 0 },
      include: [{ model: Member, as: "member", attributes: ["id", "first_name", "last_name"], required: false }],
      order: [["created_at", "DESC"]],
      limit: 50,
    }),
    safeFind(PastoralVisitation, {
      where: { ministry_group_id: ministryGroupId, is_deleted: 0 },
      include: [
        { model: Member, as: "member", attributes: ["id", "first_name", "last_name"], required: false },
        { model: User, as: "visitor", attributes: ["id", "email"], required: false },
      ],
      order: [["visit_date", "DESC"], ["id", "DESC"]],
      limit: 50,
    }),
    safeFind(Member, { where: { group_id: ministryGroupId }, attributes: ["id", "status"] }),
  ]);

  const actIds = new Set(activities.map((a) => a.id));
  const scopedResponses = responses.filter((r) => actIds.has(r.activity_id));
  const scopedCheckins = checkins.filter((c) => actIds.has(c.activity_id));

  const enrichedActivities = activities.map((act) => {
    const plain = act.toJSON ? act.toJSON() : act;
    const actResps = scopedResponses.filter((r) => r.activity_id === plain.id);
    const actAtt = scopedCheckins.filter((c) => c.activity_id === plain.id);
    return {
      ...plain,
      rsvp_yes: actResps.filter((r) => r.response === "yes").length,
      rsvp_no: actResps.filter((r) => r.response === "no").length,
      rsvp_maybe: actResps.filter((r) => r.response === "maybe").length,
      actual_attended: actAtt.length,
    };
  });

  // 7 Ministry Reports summary
  const totalMembers = members.length;
  const activeMembers = members.filter((m) => m.status === "Active").length;
  const uniqueAttendedMembers = new Set(scopedCheckins.map((c) => c.member_id)).size;
  const declineReasonsMap = new Map();
  for (const r of scopedResponses.filter((x) => x.response === "no" && x.decline_reason)) {
    const key = String(r.decline_reason).trim();
    declineReasonsMap.set(key, (declineReasonsMap.get(key) || 0) + 1);
  }
  const careStageCounts = {};
  for (const v of visitations) {
    careStageCounts[v.care_stage] = (careStageCounts[v.care_stage] || 0) + 1;
  }

  return {
    activities: enrichedActivities,
    announcements,
    messages,
    feedback,
    visitations,
    reports: {
      total_members: totalMembers,
      active_members: activeMembers,
      inactive_members: Math.max(0, totalMembers - activeMembers),
      participation_rate_pct: totalMembers > 0 ? round1((uniqueAttendedMembers / totalMembers) * 100) : 0,
      rsvp_yes_total: enrichedActivities.reduce((s, a) => s + a.rsvp_yes, 0),
      actual_attendance_total: scopedCheckins.length,
      decline_reasons: [...declineReasonsMap.entries()].map(([reason, count]) => ({ reason, count })),
      care_stages: careStageCounts,
      open_prayer_requests: feedback.filter((f) => f.status === "open").length,
    },
  };
};

exports.createActivity = async (ministryGroupId, payload, user) => {
  const title = String(payload.title || "").trim();
  if (!title || !payload.activity_date) {
    throw AppError.badRequest("VALIDATION_ERROR", "Activity title and date are required.");
  }
  const created = await MinistryActivity.create({
    ministry_group_id: Number(ministryGroupId),
    title,
    activity_type: payload.activity_type || "fellowship",
    activity_date: payload.activity_date,
    start_time: payload.start_time || null,
    end_time: payload.end_time || null,
    location: payload.location || null,
    description: payload.description || null,
    linked_service_id: payload.linked_service_id || null,
    linked_event_id: payload.linked_event_id || null,
    rsvp_deadline: payload.rsvp_deadline || null,
    created_by: user.userId,
  });
  auditLog.log({ userId: user.userId, action: "CREATE_MINISTRY_ACTIVITY", targetTable: "ministry_activities", targetId: created.id });
  return created;
};

// Record actual attendance (idempotent via UNIQUE(activity_id, member_id) — zero double-counting)
exports.recordActivityAttendance = async (activityId, payload, user) => {
  const memberIds = Array.isArray(payload.member_ids)
    ? payload.member_ids.map(Number).filter((n) => n > 0)
    : (payload.member_id ? [Number(payload.member_id)] : []);
  if (!memberIds.length) throw AppError.badRequest("VALIDATION_ERROR", "Select at least one member.");

  const source = ["qr", "manual", "imported_service", "imported_event"].includes(payload.source) ? payload.source : "manual";
  let added = 0;
  for (const memberId of [...new Set(memberIds)]) {
    const [, created] = await MinistryActivityAttendance.findOrCreate({
      where: { activity_id: Number(activityId), member_id: memberId },
      defaults: { activity_id: Number(activityId), member_id: memberId, source, recorded_by: user.userId },
    });
    if (created) added += 1;
  }
  return { activity_id: Number(activityId), recorded_new: added, total_submitted: memberIds.length };
};

// Import service check-ins into a ministry activity without double-counting
exports.importAttendanceFromService = async (ministryGroupId, activityId, serviceId, user) => {
  const members = await Member.findAll({ where: { group_id: ministryGroupId }, attributes: ["id"], raw: true });
  const memberIds = members.map((m) => m.id);
  if (!memberIds.length) return { imported: 0 };

  const serviceCheckins = await Attendance.findAll({
    where: { service_id: Number(serviceId), member_id: { [Op.in]: memberIds }, check_in_method: { [Op.ne]: "pre-reg" } },
    attributes: ["member_id"],
    raw: true,
  });
  const ids = [...new Set(serviceCheckins.map((r) => r.member_id))];
  if (!ids.length) return { imported: 0 };
  const res = await exports.recordActivityAttendance(activityId, { member_ids: ids, source: "imported_service" }, user);
  return { imported: res.recorded_new };
};

exports.createAnnouncement = async (ministryGroupId, payload, user) => {
  const title = String(payload.title || "").trim();
  const body = String(payload.body || "").trim();
  if (!title || !body) throw AppError.badRequest("VALIDATION_ERROR", "Announcement title and message are required.");
  const created = await MinistryAnnouncement.create({
    ministry_group_id: Number(ministryGroupId),
    title,
    body,
    is_pinned: payload.is_pinned ? 1 : 0,
    published_by: user.userId,
  });
  auditLog.log({ userId: user.userId, action: "CREATE_MINISTRY_ANNOUNCEMENT", targetTable: "ministry_announcements", targetId: created.id });
  return created;
};

exports.sendMessage = async (payload, user) => {
  const body = String(payload.body || "").trim();
  const memberId = Number(payload.member_id);
  if (!memberId || !body) throw AppError.badRequest("VALIDATION_ERROR", "Member and message text are required.");
  const created = await MemberMessage.create({
    ministry_group_id: payload.ministry_group_id || null,
    member_id: memberId,
    sender_user_id: user.userId,
    direction: payload.direction === "member_to_leader" ? "member_to_leader" : "leader_to_member",
    subject: payload.subject || null,
    body,
  });
  auditLog.log({ userId: user.userId, action: "SEND_MEMBER_MESSAGE", targetTable: "member_messages", targetId: created.id });
  return created;
};

exports.respondToFeedback = async (feedbackId, payload, user) => {
  const row = await MemberFeedback.findOne({ where: { id: feedbackId, is_deleted: 0 } });
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Prayer request or feedback not found");
  const status = ["open", "acknowledged", "prayed_for", "resolved"].includes(payload.status) ? payload.status : "prayed_for";
  await row.update({
    status,
    leader_response: payload.leader_response ?? row.leader_response,
    responded_by: user.userId,
    responded_at: new Date(),
  });
  return row;
};

exports.createVisitation = async (payload, user) => {
  const memberId = Number(payload.member_id);
  if (!memberId) throw AppError.badRequest("VALIDATION_ERROR", "Member is required.");
  const allowedStages = ["needs_followup", "contacted", "in_progress", "visitation_scheduled", "completed"];
  const careStage = allowedStages.includes(payload.care_stage) ? payload.care_stage : "contacted";
  const created = await PastoralVisitation.create({
    member_id: memberId,
    ministry_group_id: payload.ministry_group_id || null,
    cell_group_id: payload.cell_group_id || null,
    visit_date: payload.visit_date || new Date().toISOString().slice(0, 10),
    visit_type: payload.visit_type || "follow_up",
    care_stage: careStage,
    notes: payload.notes || null,
    next_action_date: payload.next_action_date || null,
    visited_by_user_id: user.userId,
  });
  auditLog.log({ userId: user.userId, action: "LOG_PASTORAL_VISITATION", targetTable: "pastoral_visitations", targetId: created.id });
  return created;
};

exports.updateVisitationStage = async (visitId, careStage) => {
  const allowedStages = ["needs_followup", "contacted", "in_progress", "visitation_scheduled", "completed"];
  if (!allowedStages.includes(careStage)) throw AppError.badRequest("VALIDATION_ERROR", "Invalid pastoral care stage.");
  const row = await PastoralVisitation.findOne({ where: { id: visitId, is_deleted: 0 } });
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Visitation log not found");
  await row.update({ care_stage: careStage });
  return row;
};

// ── Member Engagement Profile (for MemberProfilePage)
exports.getMemberEngagementProfile = async (memberId) => {
  const member = await Member.findByPk(memberId, {
    include: [{ model: MinistryGroup, as: "group", attributes: ["id", "name"], required: false }],
  });
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  const [servingTeams, rsvps, actualAttendance, visitations, feedback] = await Promise.all([
    safeFind(MinistryMembership, {
      where: { member_id: member.id },
      include: [{ model: MinistryRole, attributes: ["id", "name", "category"], required: false }],
    }),
    safeFind(MinistryAttendanceResponse, {
      where: { member_id: member.id },
      include: [{ model: MinistryActivity, as: "activity", attributes: ["id", "title", "activity_date"], required: false }],
      order: [["updated_at", "DESC"]],
      limit: 20,
    }),
    safeFind(MinistryActivityAttendance, { where: { member_id: member.id }, limit: 50 }),
    safeFind(PastoralVisitation, {
      where: { member_id: member.id, is_deleted: 0 },
      order: [["visit_date", "DESC"]],
      limit: 20,
    }),
    safeFind(MemberFeedback, {
      where: { member_id: member.id, is_deleted: 0 },
      order: [["created_at", "DESC"]],
      limit: 20,
    }),
  ]);

  return {
    ministry: member.group || null,
    serving_teams: servingTeams.map((t) => t.MinistryRole || t.ministryRole).filter(Boolean),
    rsvp_summary: {
      yes: rsvps.filter((r) => r.response === "yes").length,
      no: rsvps.filter((r) => r.response === "no").length,
      maybe: rsvps.filter((r) => r.response === "maybe").length,
      actual_attended: actualAttendance.length,
    },
    recent_rsvps: rsvps,
    visitations,
    feedback,
  };
};

// ── Calm Member Portal Engagement (self-scoped to req.user.memberId only)
exports.getPortalEngagement = async (user) => {
  if (!user?.memberId) return { ministry: null, activities: [], announcements: [], messages: [], feedback: [] };
  const member = await Member.findByPk(user.memberId, {
    include: [{ model: MinistryGroup, as: "group", attributes: ["id", "name"], required: false }],
  });
  if (!member) return { ministry: null, activities: [], announcements: [], messages: [], feedback: [] };

  const groupId = member.group_id;
  const [activities, myResponses, announcements, messages, feedback] = await Promise.all([
    groupId ? safeFind(MinistryActivity, {
      where: { ministry_group_id: groupId, is_deleted: 0, status: { [Op.ne]: "cancelled" } },
      order: [["activity_date", "ASC"]],
      limit: 20,
    }) : Promise.resolve([]),
    safeFind(MinistryAttendanceResponse, { where: { member_id: member.id } }),
    groupId ? safeFind(MinistryAnnouncement, {
      where: { ministry_group_id: groupId, is_deleted: 0 },
      order: [["is_pinned", "DESC"], ["created_at", "DESC"]],
      limit: 15,
    }) : Promise.resolve([]),
    safeFind(MemberMessage, {
      where: { member_id: member.id, is_deleted: 0 },
      include: [{ model: User, as: "sender", attributes: ["id", "email"], required: false }],
      order: [["created_at", "DESC"]],
      limit: 30,
    }),
    safeFind(MemberFeedback, {
      where: { member_id: member.id, is_deleted: 0 },
      order: [["created_at", "DESC"]],
      limit: 20,
    }),
  ]);

  const respMap = new Map(myResponses.map((r) => [r.activity_id, r]));
  return {
    ministry: member.group || null,
    activities: activities.map((a) => {
      const plain = a.toJSON ? a.toJSON() : a;
      const resp = respMap.get(plain.id);
      return {
        ...plain,
        my_response: resp?.response || "no_response",
        my_decline_reason: resp?.decline_reason || null,
      };
    }),
    announcements,
    messages,
    feedback,
  };
};

// Member submits RSVP (Yes / No / Maybe + optional decline reason) — strictly separate from actual check-in!
exports.submitPortalRsvp = async (activityId, payload, user) => {
  if (!user?.memberId) throw AppError.forbidden("Member account required.");
  const response = payload.response;
  if (!["yes", "no", "maybe"].includes(response)) {
    throw AppError.badRequest("VALIDATION_ERROR", "RSVP must be 'yes', 'no', or 'maybe'.");
  }
  const [row] = await MinistryAttendanceResponse.findOrCreate({
    where: { activity_id: Number(activityId), member_id: Number(user.memberId) },
    defaults: {
      activity_id: Number(activityId),
      member_id: Number(user.memberId),
      response,
      decline_reason: response === "no" ? (payload.decline_reason || null) : null,
      responded_at: new Date(),
    },
  });
  await row.update({
    response,
    decline_reason: response === "no" ? (payload.decline_reason || null) : null,
    responded_at: new Date(),
  });
  return row;
};

exports.submitPortalFeedback = async (payload, user) => {
  if (!user?.memberId) throw AppError.forbidden("Member account required.");
  const message = String(payload.message || "").trim();
  if (!message) throw AppError.badRequest("VALIDATION_ERROR", "Message is required.");
  const member = await Member.findByPk(user.memberId, { attributes: ["id", "group_id"] });
  const allowedCats = ["prayer_request", "question", "suggestion", "care_needed"];
  return MemberFeedback.create({
    member_id: Number(user.memberId),
    ministry_group_id: member?.group_id || null,
    category: allowedCats.includes(payload.category) ? payload.category : "prayer_request",
    subject: payload.subject || null,
    message,
    is_confidential: payload.is_confidential === false ? 0 : 1,
    status: "open",
  });
};
