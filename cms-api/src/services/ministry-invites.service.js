"use strict";

const auditLog     = require("../helpers/auditLog.helper");
const notifService = require("./notifications.service");
const {
  MinistryEventInvite,
  MinistryRole,
  Event,
  Member,
  User,
} = require("../models");

// ── Shared includes ──────────────────────────────────────────
const inviteIncludes = [
  {
    model: Event,
    attributes: ["id", "title", "start_date", "start_time", "end_date", "location", "status"],
    required: false,
  },
  {
    model: MinistryRole,
    as: "ministryRole",
    attributes: ["id", "name"],
    required: false,
  },
  {
    model: Member,
    as: "member",
    attributes: ["id", "first_name", "last_name", "email", "phone"],
    required: false,
  },
];

// ── Get Invites for an Event (Ministry Leader view) ──────────
// Returns all invite rows for a given event, optionally scoped
// to a specific ministry_role_id (so a Leader only sees their ministry).
exports.getInvitesByEvent = async (eventId, ministryRoleId = null) => {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, message: "Event not found" };

  const where = { event_id: eventId };
  if (ministryRoleId) where.ministry_role_id = ministryRoleId;

  return await MinistryEventInvite.findAll({
    where,
    include: inviteIncludes,
    order:   [["created_at", "ASC"]],
  });
};

// ── Create Invites (bulk) ────────────────────────────────────
// Accepts an array of member_ids. Skips duplicates silently.
// Sends a notification to each invited member's portal account.
exports.createInvites = async (
  eventId,
  { ministry_role_id, member_ids, response_deadline },
  invitedBy,
) => {
  const event = await Event.findByPk(eventId);
  if (!event) throw { status: 404, message: "Event not found" };

  const role = await MinistryRole.findByPk(ministry_role_id);
  if (!role) throw { status: 404, message: "Ministry role not found" };

  if (!Array.isArray(member_ids) || member_ids.length === 0)
    throw { status: 400, message: "member_ids must be a non-empty array" };

  const results = { created: [], skipped: [], errors: [] };

  for (const memberId of member_ids) {
    try {
      const member = await Member.findByPk(memberId);
      if (!member) {
        results.errors.push({ memberId, reason: "Member not found" });
        continue;
      }

      // Skip if invite already exists for this event + ministry + member
      const existing = await MinistryEventInvite.findOne({
        where: { event_id: eventId, ministry_role_id, member_id: memberId },
      });
      if (existing) {
        results.skipped.push(memberId);
        continue;
      }

      await MinistryEventInvite.create({
        event_id:          eventId,
        ministry_role_id,
        member_id:         memberId,
        invited_by:        invitedBy,
        response_status:   "pending",
        response_deadline: response_deadline || null,
      });

      results.created.push(memberId);

      // Notify the member's portal account (non-fatal)
      try {
        const userRecord = await User.findOne({
          where:      { member_id: memberId, is_active: true },
          attributes: ["id"],
        });
        if (userRecord) {
          await notifService.createNotification({
            user_id:        userRecord.id,
            type:           "ministry_invite",
            message:        `You have been invited to participate in "${event.title}" as part of the ${role.name} ministry.`,
            reference_id:   eventId,
            reference_type: "ministry_invite",
          });
        }
      } catch (err) {
        console.error("[MinistryInvites] Notification failed for member", memberId, ":", err.message);
      }
    } catch (err) {
      results.errors.push({ memberId, reason: err.message });
    }
  }

  auditLog.log({
    userId:      invitedBy,
    action:      "CREATE_MINISTRY_INVITES",
    targetTable: "ministry_event_invites",
    targetId:    null,
    newValues:   { event_id: eventId, ministry_role_id, created: results.created },
  });

  return results;
};

// ── Respond to Invite (member self-service) ──────────────────
// Only the invited member's own portal account may call this.
// memberId comes from req.user.memberId (set by verifyToken).
exports.respondToInvite = async (inviteId, memberId, response_status) => {
  const validStatuses = ["attending", "not_attending"];
  if (!validStatuses.includes(response_status))
    throw { status: 400, message: `response_status must be one of: ${validStatuses.join(", ")}` };

  const invite = await MinistryEventInvite.findByPk(inviteId, {
    include: inviteIncludes,
  });
  if (!invite) throw { status: 404, message: "Invite not found" };

  // Guard: only the invited member may respond
  if (invite.member_id !== parseInt(memberId))
    throw { status: 403, message: "You can only respond to your own invites" };

  // Guard: check deadline has not passed
  if (invite.response_deadline && new Date() > new Date(invite.response_deadline))
    throw { status: 400, message: "Response deadline has passed" };

  // Guard: prevent re-responding once a response has already been recorded.
  // If you need to allow response changes, remove this block.
  if (invite.response_status !== "pending")
    throw { status: 400, message: "You have already responded to this invite" };

  await invite.update({
    response_status,
    responded_at: new Date(),
  });

  return invite.reload({ include: inviteIncludes });
};

// ── Get a Single Invite by ID ────────────────────────────────
exports.getInviteById = async (inviteId) => {
  const invite = await MinistryEventInvite.findByPk(inviteId, {
    include: inviteIncludes,
  });
  if (!invite) throw { status: 404, message: "Invite not found" };
  return invite;
};
