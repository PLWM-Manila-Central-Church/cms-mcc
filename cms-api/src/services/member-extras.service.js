"use strict";

const {
  EmergencyContact,
  MemberNote,
  MemberStatusHistory,
  InvitedMember,
  Member,
} = require("../models");
const crypto = require("crypto");

// ── Emergency Contacts ───────────────────────────────────────
exports.getEmergencyContacts = async (memberId) => {
  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };
  return await EmergencyContact.findAll({ where: { member_id: memberId } });
};

exports.createEmergencyContact = async (memberId, data) => {
  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };

  const { name, relationship, phone } = data;

  // FIX BUG 11: prevent creating contacts with an empty name,
  // guarding against UI bypasses or direct API calls.
  if (!name || !name.trim()) {
    throw { status: 400, message: "Contact name is required" };
  }

  return await EmergencyContact.create({
    member_id: memberId,
    name:         name.trim(),
    relationship: relationship || null,
    phone:        phone        || null,
  });
};

exports.updateEmergencyContact = async (id, data) => {
  const contact = await EmergencyContact.findByPk(id);
  if (!contact) throw { status: 404, message: "Emergency contact not found" };

  const { name, relationship, phone } = data;

  if (name !== undefined && !name.trim()) {
    throw { status: 400, message: "Contact name cannot be empty" };
  }

  await contact.update({
    ...(name         && { name: name.trim() }),
    ...(relationship && { relationship }),
    ...(phone        && { phone }),
  });
  return contact;
};

exports.deleteEmergencyContact = async (id) => {
  const contact = await EmergencyContact.findByPk(id);
  if (!contact) throw { status: 404, message: "Emergency contact not found" };
  await contact.destroy();
  return { message: "Emergency contact deleted successfully." };
};

// ── Member Notes ─────────────────────────────────────────────
exports.getMemberNotes = async (memberId) => {
  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };
  return await MemberNote.findAll({
    where: { member_id: memberId },
    order: [["created_at", "DESC"]],
  });
};

exports.createMemberNote = async (memberId, data, createdBy) => {
  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };

  const { note, is_confidential } = data;
  return await MemberNote.create({
    member_id: memberId,
    note,
    is_confidential: is_confidential !== undefined ? is_confidential : 1,
    created_by: createdBy,
  });
};

exports.deleteMemberNote = async (id) => {
  const note = await MemberNote.findByPk(id);
  if (!note) throw { status: 404, message: "Member note not found" };
  await note.destroy();
  return { message: "Member note deleted successfully." };
};

// ── Member Status History ────────────────────────────────────
exports.getMemberStatusHistory = async (memberId) => {
  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };
  return await MemberStatusHistory.findAll({
    where: { member_id: memberId },
    order: [["created_at", "DESC"]],
  });
};

exports.createMemberStatusHistory = async (memberId, data, changedBy) => {
  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };

  const { new_status, reason } = data;
  const old_status = member.status;

  if (old_status === new_status)
    throw { status: 400, message: "New status is the same as current status" };

  await member.update({ status: new_status });

  return await MemberStatusHistory.create({
    member_id:  memberId,
    old_status,
    new_status,
    changed_by: changedBy,
    reason:     reason || null,
  });
};

// ── Invited Members ──────────────────────────────────────────
exports.getAllInvites = async () => {
  return await InvitedMember.findAll({ order: [["created_at", "DESC"]] });
};

exports.getInviteById = async (id) => {
  const invite = await InvitedMember.findByPk(id);
  if (!invite) throw { status: 404, message: "Invite not found" };
  return invite;
};

exports.createInvite = async (data, invitedBy) => {
  const { email, first_name, last_name } = data;

  const existing = await InvitedMember.findOne({ where: { email } });
  if (existing) throw { status: 409, message: "Email already invited" };

  const invite_token = crypto.randomBytes(32).toString("hex");
  const expires_at   = new Date(Date.now() + 7 * 24 * 3600 * 1000); // 7 days

  return await InvitedMember.create({
    email,
    first_name,
    last_name,
    invite_token,
    invited_by: invitedBy,
    expires_at,
    status: "pending",
  });
};

exports.deleteInvite = async (id) => {
  const invite = await InvitedMember.findByPk(id);
  if (!invite) throw { status: 404, message: "Invite not found" };
  await invite.destroy();
  return { message: "Invite deleted successfully." };
};
