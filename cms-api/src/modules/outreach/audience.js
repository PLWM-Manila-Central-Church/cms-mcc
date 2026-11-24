"use strict";

const { Op, fn, col } = require("sequelize");
const AppError = require("../../helpers/AppError");
const { Member, EventRegistration, MinistryMembership } = require("../../models");
const { OutreachPreference, OutreachDelivery } = require("./models");
const { normalizePhone, maskedPhone, estimateSegments, renderCampaignMessage } = require("./policy");

const EXCLUDED_KEYS = ["inactive", "no_phone", "no_consent", "opted_out", "preference_disabled", "minor_without_guardian", "duplicate", "frequency_cap", "recipient_restricted", "not_found"];

const emptyExcluded = () => EXCLUDED_KEYS.reduce((result, key) => ({ ...result, [key]: 0 }), {});

const ageAt = (birthdate, now = new Date()) => {
  if (!birthdate) return null;
  const born = new Date(birthdate);
  if (Number.isNaN(born.getTime())) return null;
  let age = now.getFullYear() - born.getFullYear();
  const month = now.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age--;
  return age;
};

const resolveMembers = async ({ audience_type, event_id, ministry_id, cell_group_id, member_ids }) => {
  if (audience_type === "selected_members") {
    const ids = [...new Set(member_ids || [])];
    return { members: await Member.findAll({ where: { id: { [Op.in]: ids } }, order: [["id", "ASC"]] }), warning: null };
  }
  if (audience_type === "event") {
    if (!event_id) throw AppError.badRequest("EVENT_REQUIRED", "Choose an event for this notification");
    const registrations = await EventRegistration.findAll({ where: { event_id }, attributes: ["member_id"] });
    const ids = [...new Set(registrations.map((row) => Number(row.member_id)))];
    if (!ids.length) return { members: [], warning: "This event has no registered members yet." };
    return { members: await Member.findAll({ where: { id: { [Op.in]: ids }, status: "Active" } }), warning: null };
  }
  if (audience_type === "ministry") {
    if (!ministry_id) throw AppError.badRequest("MINISTRY_REQUIRED", "Choose a ministry for this notification");
    const memberships = await MinistryMembership.findAll({ where: { ministry_role_id: ministry_id }, attributes: ["member_id"] });
    const ids = [...new Set(memberships.map((row) => Number(row.member_id)))];
    if (!ids.length) return { members: [], warning: "This ministry has no members yet." };
    return { members: await Member.findAll({ where: { id: { [Op.in]: ids }, status: "Active" } }), warning: null };
  }
  if (audience_type === "cell_group") {
    if (!cell_group_id) throw AppError.badRequest("CELL_GROUP_REQUIRED", "Choose a cell group for this notification");
    return { members: await Member.findAll({ where: { cell_group_id, status: "Active" } }), warning: null };
  }
  if (audience_type === "all_members") {
    return { members: await Member.findAll({ where: { status: "Active" } }), warning: null };
  }
  throw AppError.badRequest("INVALID_AUDIENCE", "Choose a valid audience");
};

const deliveryCounts = async (memberIds, now) => {
  if (!memberIds.length) return { weekly: new Map(), monthly: new Map() };
  const monthStart = new Date(now.getTime() - 30 * 86400000);
  const weekStart = new Date(now.getTime() - 7 * 86400000);
  const rows = await OutreachDelivery.findAll({
    where: {
      member_id: { [Op.in]: memberIds }, channel: "sms",
      status: { [Op.in]: ["queued", "processing", "sent", "delivered", "unknown"] },
      created_at: { [Op.gte]: monthStart },
    },
    attributes: ["member_id", [fn("COUNT", col("id")), "total"], [fn("MAX", col("created_at")), "last_at"]],
    group: ["member_id"], raw: true,
  });
  const weekly = new Map();
  const monthly = new Map();
  for (const row of rows) {
    const memberId = Number(row.member_id);
    const total = Number(row.total) || 0;
    monthly.set(memberId, total);
    if (row.last_at && new Date(row.last_at) >= weekStart) weekly.set(memberId, 1);
  }
  // The aggregate above cannot distinguish a week's count; fetch the weekly
  // count separately so caps are enforced precisely.
  const weeklyRows = await OutreachDelivery.findAll({
    where: {
      member_id: { [Op.in]: memberIds }, channel: "sms",
      status: { [Op.in]: ["queued", "processing", "sent", "delivered", "unknown"] },
      created_at: { [Op.gte]: weekStart },
    },
    attributes: ["member_id", [fn("COUNT", col("id")), "total"]],
    group: ["member_id"], raw: true,
  });
  for (const row of weeklyRows) weekly.set(Number(row.member_id), Number(row.total) || 0);
  return { weekly, monthly };
};

const resolveAudience = async (input, config, now = new Date()) => {
  const { members, warning } = await resolveMembers(input);
  const preferences = members.length
    ? await OutreachPreference.findAll({ where: { member_id: { [Op.in]: members.map((member) => member.id) } } })
    : [];
  const preferenceByMember = new Map(preferences.map((preference) => [Number(preference.member_id), preference]));
  const excluded = emptyExcluded();
  const selected = input.audience_type === "selected_members";
  const recipientStatus = new Map();
  const exclude = (id, reason) => {
    excluded[reason]++;
    if (selected) recipientStatus.set(Number(id), { member_id: Number(id), reason });
  };
  if (selected) {
    const found = new Set(members.map((member) => Number(member.id)));
    for (const id of new Set(input.member_ids || [])) {
      if (!found.has(Number(id))) exclude(id, "not_found");
    }
  }
  const allowedPhones = new Set((process.env.SMS_ALLOWED_RECIPIENTS || "").split(",").map(normalizePhone).filter(Boolean));
  const candidates = [];
  for (const member of members) {
    if (member.status !== "Active" || Number(member.is_deleted)) { exclude(member.id, "inactive"); continue; }
    const preference = preferenceByMember.get(Number(member.id));
    if (!preference || preference.campaign_notifications === false) { exclude(member.id, "preference_disabled"); continue; }
    if (preference.opted_out_at) { exclude(member.id, "opted_out"); continue; }
    const age = ageAt(member.birthdate, now);
    const minor = age !== null && age < 18;
    let phone = normalizePhone(member.phone);
    let recipientName = member.first_name;
    if (minor) {
      if (!preference.guardian_phone || !preference.guardian_consent_at) { exclude(member.id, "minor_without_guardian"); continue; }
      phone = normalizePhone(preference.guardian_phone);
      recipientName = preference.guardian_name || member.first_name;
      if (!phone) { exclude(member.id, "minor_without_guardian"); continue; }
    }
    if (!phone) { exclude(member.id, "no_phone"); continue; }
    const consentMissing = minor
      ? (!preference.sms_enabled || !preference.consent_at || !preference.guardian_consent_at)
      : (!preference.sms_enabled || !preference.consent_at || normalizePhone(preference.consent_phone) !== normalizePhone(member.phone));
    if (consentMissing) { exclude(member.id, "no_consent"); continue; }
    if (config.mode === "live" && process.env.SMS_ALLOW_ALL_OPTED_IN !== "true" && !allowedPhones.has(phone)) {
      exclude(member.id, "recipient_restricted"); continue;
    }
    candidates.push({
      member_id: Number(member.id), first_name: member.first_name, last_name: member.last_name,
      name: recipientName, phone, phone_masked: maskedPhone(phone), is_minor: minor,
      guardian: minor, member,
    });
  }
  const counts = await deliveryCounts(candidates.map((candidate) => candidate.member_id), now);
  const seenPhones = new Set();
  const recipients = [];
  for (const candidate of candidates) {
    const weekly = counts.weekly.get(candidate.member_id) || 0;
    const monthly = counts.monthly.get(candidate.member_id) || 0;
    if (weekly >= config.campaign_weekly_member_cap || monthly >= config.campaign_monthly_member_cap) {
      exclude(candidate.member_id, "frequency_cap"); continue;
    }
    if (seenPhones.has(candidate.phone)) { exclude(candidate.member_id, "duplicate"); continue; }
    seenPhones.add(candidate.phone);
    recipients.push(candidate);
    if (selected) recipientStatus.set(candidate.member_id, { member_id: candidate.member_id, reason: null });
  }
  return { recipients, excluded, warning, total_candidates: members.length, ...(selected ? { recipient_status: [...recipientStatus.values()] } : {}) };
};

const previewCampaign = async (input, config, now = new Date()) => {
  const audience = await resolveAudience(input, config, now);
  const activity = input.activity || {};
  const segments = audience.recipients.map((recipient) => estimateSegments(renderCampaignMessage(input.message, recipient, activity)));
  const totalSegments = segments.reduce((total, count) => total + count, 0);
  const unitCost = Number(config.campaign_unit_cost_php) || 0;
  const estimatedCost = Math.round(totalSegments * unitCost * 100) / 100;
  return {
    ...audience,
    recipients: audience.recipients.map((recipient) => ({
      member_id: recipient.member_id, first_name: recipient.first_name, last_name: recipient.last_name,
      name: recipient.name, phone: recipient.phone, phone_masked: recipient.phone_masked, is_minor: recipient.is_minor,
    })),
    recipient_count: audience.recipients.length,
    total_segments: totalSegments,
    segment_count: Math.max(1, ...segments),
    unit_cost_php: unitCost,
    estimated_cost_php: estimatedCost,
  };
};

module.exports = { resolveAudience, previewCampaign, ageAt, EXCLUDED_KEYS };
