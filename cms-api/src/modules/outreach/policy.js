"use strict";

const { createHash } = require("node:crypto");
const DAY = 86400000;
const DEFAULTS = Object.freeze({
  enabled: false, mode: "disabled", reminder_days: [3, 1], reminder_hour: 9,
  daily_sms_cap: 10,
  reminder_template: "Hi {{first_name}}, reminder: {{activity}} on {{date}} at {{time}}. {{venue}} PLWM-MCC",
  followup_template: "Hi {{first_name}}, PLWM-MCC is checking in. Need prayer or assistance? Please contact your leader. We hope to see you soon.",
  campaigns_enabled: false,
  campaign_unit_cost_php: 0.463,
  campaign_monthly_budget_php: 500,
  campaign_weekly_member_cap: 2,
  campaign_monthly_member_cap: 6,
  campaign_approval_recipient_threshold: 50,
  campaign_approval_cost_threshold: 50,
  campaign_quiet_start: 8,
  campaign_quiet_end: 20,
});
const normalizePhone = (value) => {
  const phone = String(value || "").replace(/[\s()-]/g, "");
  const match = /^(?:\+?63|0)(9\d{9})$/.exec(phone);
  return match ? "+63" + match[1] : null;
};
const maskedPhone = (value) => {
  const phone = normalizePhone(value);
  return phone ? phone.slice(0, 5) + "******" + phone.slice(-3) : null;
};
const key = (...parts) => createHash("sha256").update(parts.join("|")).digest("hex");
const isFinalized = (session) => session.status === "closed" && Boolean(session.expected_roster_frozen_at)
  && Boolean(session.finalized_at) && Number(session.finalized_revision) === Number(session.activity_revision || 1);
const getOutcome = ({ session, present, exception }) => {
  if (!isFinalized(session)) return "pending";
  if (present) return "present";
  if (exception === "excused") return "excused";
  if (exception === "pending") return "pending";
  return "absent";
};
const findAbsenceEpisode = (memberId, seriesKey, timeline) => {
  const ordered = [...timeline].filter((row) => row.status !== "cancelled")
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at) || Number(a.session_id) - Number(b.session_id));
  let run = [];
  for (const row of ordered) {
    if (row.outcome === "absent") run.push(row);
    else run = [];
  }
  if (run.length < 2) return null;
  return {
    episode_key: key("absence", memberId, seriesKey, run[0].session_id),
    episode_start_session_id: Number(run[0].session_id),
    trigger_session_id: Number(run[1].session_id),
    absence_count: run.length,
  };
};
const manilaDate = (date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" })
  .formatToParts(new Date(date)).reduce((o, p) => ({ ...o, [p.type]: p.value }), {});
const reminderWindow = (session, days, hour = 9) => {
  const p = manilaDate(session.starts_at);
  const date = new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day) - Number(days), Number(hour) - 8));
  return { due: date, expires: new Date(Math.min(date.getTime() + DAY, new Date(session.starts_at).getTime())) };
};
const reminderIsDue = (policy, session, days, config, now) => {
  if (!policy.reminders_enabled || !["draft", "open"].includes(session.status) || session.expected_basis === "none") return false;
  const window = reminderWindow(session, days, config.reminder_hour);
  return Boolean(policy.reminders_enabled_at) && new Date(policy.reminders_enabled_at) <= window.due
    && window.due <= now && now < window.expires;
};
const hasSmsConsent = (member, preference) => Boolean(member && !Number(member.is_deleted) && member.status === "Active"
  && preference?.sms_enabled && preference.consent_at && !preference.opted_out_at
  && normalizePhone(member.phone) && normalizePhone(member.phone) === preference.consent_phone);
const ageOn = (birthdate, now = new Date()) => {
  if (!birthdate) return null;
  const born = new Date(birthdate);
  if (Number.isNaN(born.getTime())) return null;
  let age = now.getFullYear() - born.getFullYear();
  const month = now.getMonth() - born.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < born.getDate())) age--;
  return age;
};
const campaignRecipientPhone = (member, preference, now = new Date()) => {
  const age = ageOn(member?.birthdate, now);
  if (age !== null && age < 18) return normalizePhone(preference?.guardian_phone);
  return normalizePhone(member?.phone);
};
const hasCampaignConsent = (member, preference, now = new Date()) => {
  if (!member || Number(member.is_deleted) || member.status !== "Active" || !preference) return false;
  if (!preference.sms_enabled || !preference.consent_at || preference.opted_out_at || preference.campaign_notifications === false) return false;
  const age = ageOn(member.birthdate, now);
  if (age !== null && age < 18) {
    return Boolean(normalizePhone(preference.guardian_phone) && preference.guardian_consent_at);
  }
  return Boolean(normalizePhone(member.phone) && normalizePhone(preference.consent_phone) === normalizePhone(member.phone));
};
const clean = (value, max) => String(value || "").replace(/[\x00-\x1f\x7f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
const renderMessage = (template, member, session = {}) => {
  const activity = session.target || {};
  const date = session.starts_at ? new Date(session.starts_at) : null;
  const variables = {
    first_name: clean(member.first_name, 30),
    activity: clean(activity.title || session.title, 60),
    date: date ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }).format(date) : "",
    time: date ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }).format(date) : "",
    venue: clean(activity.venue || activity.location, 40),
  };
  return clean(String(template).replace(/\{\{([a-z_]+)\}\}/g, (_match, name) => variables[name] || ""), 480);
};
const estimateSegments = (text) => {
  const basic = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const extended = "^{}\\[~]|€";
  let length = 0;
  for (const char of text) {
    if (basic.includes(char)) length++;
    else if (extended.includes(char)) length += 2;
    else return text.length <= 70 ? 1 : Math.ceil(text.length / 67);
  }
  return length <= 160 ? 1 : Math.ceil(length / 153);
};
const renderCampaignMessage = (template, member, activity = {}) => {
  const date = activity.date ? new Date(activity.date) : null;
  const variables = {
    first_name: clean(member.first_name, 30),
    activity: clean(activity.title, 60),
    date: date && !Number.isNaN(date.getTime())
      ? new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" }).format(date) : "",
    time: activity.time ? clean(activity.time, 20) : "",
    venue: clean(activity.venue, 40),
  };
  return clean(String(template).replace(/\{\{([a-z_]+)\}\}/g, (_match, name) => variables[name] || ""), 480);
};
const estimateCampaignCost = (recipients, template, activity, unitCost) => {
  const segments = recipients.map((recipient) => estimateSegments(renderCampaignMessage(template, recipient, activity)));
  const totalSegments = segments.reduce((total, count) => total + count, 0);
  return { segment_count: Math.max(1, ...segments), total_segments: totalSegments,
    estimated_cost_php: Math.round(totalSegments * Number(unitCost) * 100) / 100 };
};
module.exports = { DEFAULTS, DAY, normalizePhone, maskedPhone, key, isFinalized, getOutcome, findAbsenceEpisode, reminderWindow, reminderIsDue, hasSmsConsent, hasCampaignConsent, campaignRecipientPhone, ageOn, renderMessage, renderCampaignMessage, estimateCampaignCost, estimateSegments };
