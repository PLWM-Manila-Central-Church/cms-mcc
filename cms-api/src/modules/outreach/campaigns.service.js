"use strict";

const sequelize = require("../../config/db");
const { Op } = require("sequelize");
const AppError = require("../../helpers/AppError");
const { Event, User, Member } = require("../../models");
const { OutreachDelivery, NotificationCampaign } = require("./models");
const { getConfiguration, transportState } = require("./configuration");
const { previewCampaign } = require("./audience");
const { renderCampaignMessage, estimateSegments, key } = require("./policy");
const { CAMPAIGN_ROLES, canBroadcast, canApprove } = require("./permissions");
const { audit } = require("./repository");

const PAGE_SIZE = 25;
const MONTH = 30 * 86400000;
const campaignStatus = (campaign) => String(campaign.status);

const activityFor = async (input, scheduledAt) => {
  if (input.audience_type === "event" && input.event_id) {
    const event = await Event.findByPk(input.event_id, { attributes: ["id", "title", "start_date", "start_time", "location", "status"] });
    if (!event) throw AppError.notFound("EVENT_NOT_FOUND", "The selected event was not found");
    if (event.status === "Cancelled") throw AppError.conflict("EVENT_CANCELLED", "This event was cancelled");
    return {
      title: event.title, date: event.start_date, time: event.start_time,
      venue: event.location, event,
    };
  }
  const date = scheduledAt ? new Date(scheduledAt) : new Date();
  return {
    title: input.title || "Church update",
    date: date.toISOString().slice(0, 10),
    time: new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" }).format(date),
    venue: "",
  };
};

const assertAudiencePermission = (user) => {
  if (!canBroadcast(user)) throw AppError.forbidden("Only Registration Team can manage SMS notifications");
};

const assertCampaignRead = (user) => {
  if (!CAMPAIGN_ROLES.includes(user?.roleName)) throw AppError.forbidden("You cannot view SMS notifications");
};

const memberOptions = async ({ search = "", page = 1, limit = 25 }) => {
  const names = search.trim().split(/\s+/).filter(Boolean);
  const where = { status: "Active" };
  if (names.length) where[Op.and] = names.map((name) => ({
    [Op.or]: [{ first_name: { [Op.like]: `%${name}%` } }, { last_name: { [Op.like]: `%${name}%` } }],
  }));
  const { rows, count } = await Member.findAndCountAll({
    where, attributes: ["id", "first_name", "last_name"],
    order: [["last_name", "ASC"], ["first_name", "ASC"], ["id", "ASC"]],
    limit, offset: (page - 1) * limit,
  });
  return { items: rows.map((member) => ({ id: member.id, label: `${member.first_name} ${member.last_name || ""}`.trim() })),
    page, total: count, total_pages: Math.max(1, Math.ceil(count / limit)) };
};

const quietHour = (scheduledAt) => Number(new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila", hour: "2-digit", hour12: false,
}).format(new Date(scheduledAt)));

const withinSendWindow = (date, config) => quietHour(date) >= Number(config.campaign_quiet_start) && quietHour(date) < Number(config.campaign_quiet_end);

// A deliberate Send now to one selected member can go out at any hour.
const canSendCampaignAt = (campaign, date, config) => withinSendWindow(date, config)
  || (campaign.timing_mode === "send_now" && campaign.audience_type === "selected_members"
    && Array.isArray(campaign.member_ids) && campaign.member_ids.length === 1);

const assertSendWindow = (campaign, scheduledAt, config) => {
  if (!canSendCampaignAt(campaign, scheduledAt, config)) {
    throw AppError.badRequest("OUTSIDE_SEND_WINDOW",
      `Schedule between ${config.campaign_quiet_start}:00 and ${config.campaign_quiet_end}:00 Asia/Manila`);
  }
};

const monthlyCommitment = async (now = new Date()) => {
  const start = new Date(now.getTime() - MONTH);
  const rows = await NotificationCampaign.findAll({
    where: { status: { [Op.in]: ["approved", "scheduled", "sending", "completed", "failed"] }, created_at: { [Op.gte]: start } },
    attributes: ["estimated_cost_php", "actual_cost_php"], raw: true,
  });
  return rows.reduce((total, row) => total + Math.max(Number(row.actual_cost_php) || 0, Number(row.estimated_cost_php) || 0), 0);
};

const approvalRequired = (preview, config) => preview.audience_type === "all_members"
  || preview.recipient_count > Number(config.campaign_approval_recipient_threshold)
  || preview.estimated_cost_php > Number(config.campaign_approval_cost_threshold);

const preview = async (input, user, now = new Date()) => {
  assertAudiencePermission(user, input);
  const config = await getConfiguration();
  if (!config.campaigns_enabled) throw AppError.conflict("CAMPAIGNS_DISABLED", "Notification campaigns are turned off");
  if (input.timing_mode === "send_now" && !input.scheduled_at) assertSendWindow(input, now, config);
  const activity = await activityFor(input, input.scheduled_at || now);
  const mode = config.mode || "simulation";
  const transport = transportState();
  const liveReady = transport.sms_delivery_enabled && transport.provider_configured && transport.recipient_restriction_configured;
  const result = await previewCampaign({ ...input, activity }, config, now);
  result.approval_required = approvalRequired({ ...result, audience_type: input.audience_type }, config);
  result.monthly_committed_php = await monthlyCommitment(now);
  result.monthly_remaining_php = Math.max(0, Math.round((Number(config.campaign_monthly_budget_php) - result.monthly_committed_php) * 100) / 100);
  return {
    ...result, mode,
    // Manual campaigns have their own switch; automatic reminder evaluation
    // must not be a prerequisite for the registration team to send a campaign.
    sending_available: mode === "simulation" || mode === "live" && liveReady,
    recipients: result.recipients.map((recipient) => ({
      member_id: recipient.member_id, name: recipient.name,
      phone_masked: recipient.phone_masked, is_minor: recipient.is_minor,
    })),
  };
};

const create = async (input, user) => {
  const config = await getConfiguration();
  if (!config.campaigns_enabled) throw AppError.conflict("CAMPAIGNS_DISABLED", "Notification campaigns are turned off");
  assertAudiencePermission(user, input);
  const where = { created_by: user.userId, submission_key: input.submission_key };
  if (input.submission_key) {
    const existing = await NotificationCampaign.findOne({ where });
    if (existing) return existing;
  }
  const immediate = input.timing_mode === "send_now";
  const scheduledAt = immediate ? new Date() : new Date(input.scheduled_at);
  if (Number.isNaN(scheduledAt.getTime()) || (!immediate && scheduledAt <= new Date())) {
    throw AppError.badRequest("INVALID_SCHEDULE", "Choose a future send time");
  }
  assertSendWindow(input, scheduledAt, config);
  const prepared = await preview({ ...input, scheduled_at: scheduledAt.toISOString() }, user);
  if (!prepared.sending_available) throw AppError.conflict("SMS_DISABLED", "SMS processing is disabled or the provider is unavailable");
  if (!prepared.recipient_count) throw AppError.conflict("NO_RECIPIENTS", prepared.warning || "No eligible recipients for this audience");
  if (prepared.estimated_cost_php > prepared.monthly_remaining_php) {
    throw AppError.conflict("MONTHLY_BUDGET_EXCEEDED", "This notification exceeds the remaining monthly SMS budget");
  }
  const budgetCap = input.budget_cap_php == null ? prepared.estimated_cost_php : Number(input.budget_cap_php);
  if (prepared.estimated_cost_php > budgetCap) throw AppError.conflict("CAMPAIGN_BUDGET_EXCEEDED", "The estimated cost exceeds this notification's budget");
  const windowEnd = input.window_end ? new Date(input.window_end) : new Date(scheduledAt.getTime() + 24 * 3600000);
  const values = {
    title: input.title, audience_type: input.audience_type,
    event_id: input.event_id || null, ministry_id: input.ministry_id || null, cell_group_id: input.cell_group_id || null,
    message: input.message, scheduled_at: scheduledAt, window_end: windowEnd,
    member_ids: input.member_ids ? [...new Set(input.member_ids)] : null,
    timing_mode: input.timing_mode || "scheduled", submission_key: input.submission_key || null,
    recipient_count: prepared.recipient_count, segment_count: prepared.segment_count,
    estimated_cost_php: prepared.estimated_cost_php, budget_cap_php: budgetCap,
    approval_required: prepared.approval_required, status: "draft", created_by: user.userId,
  };
  const [campaign, created] = input.submission_key
    ? await NotificationCampaign.findOrCreate({ where, defaults: values })
    : [await NotificationCampaign.create(values), true];
  if (!created) return campaign;
  await audit(user, "NOTIFICATION_CAMPAIGN_CREATED", "notification_campaigns", campaign.id,
    { title: campaign.title, audience_type: campaign.audience_type, recipient_count: campaign.recipient_count });
  return campaign;
};

const kickImmediate = (campaign) => {
  if (campaign.timing_mode !== "send_now" || campaign.status !== "approved") return;
  const id = campaign.id;
  setImmediate(async () => {
    try {
      await queueDueCampaigns(new Date(), id);
      await require("./dispatcher").processQueue({ campaignId: id });
      await refreshCampaignStatus(id);
    } catch (error) {
      require("../../helpers/logger").error("Immediate SMS processing failed", { campaignId: id, error: error.name });
    }
  });
};

const transition = async (campaign, values) => {
  const [changed] = await NotificationCampaign.update(values, { where: { id: campaign.id, status: campaign.status } });
  return changed ? Object.assign(campaign, values) : null;
};

const submit = async (id, user) => {
  const campaign = await NotificationCampaign.findByPk(id);
  if (!campaign) throw AppError.notFound("CAMPAIGN_NOT_FOUND", "Notification not found");
  assertAudiencePermission(user);
  if (campaignStatus(campaign) !== "draft") return campaign;
  const prepared = await preview({
    audience_type: campaign.audience_type, event_id: campaign.event_id, ministry_id: campaign.ministry_id,
    cell_group_id: campaign.cell_group_id, message: campaign.message, title: campaign.title,
    scheduled_at: campaign.scheduled_at, member_ids: campaign.member_ids,
  }, user);
  if (!prepared.recipient_count) throw AppError.conflict("NO_RECIPIENTS", prepared.warning || "No eligible recipients for this audience");
  if (prepared.estimated_cost_php > prepared.monthly_remaining_php) {
    throw AppError.conflict("MONTHLY_BUDGET_EXCEEDED", "This notification exceeds the remaining monthly SMS budget");
  }
  const required = approvalRequired({ ...prepared, audience_type: campaign.audience_type },
    await getConfiguration());
  const status = required ? "pending_approval" : "approved";
  if (!await transition(campaign, {
    recipient_count: prepared.recipient_count, segment_count: prepared.segment_count,
    estimated_cost_php: prepared.estimated_cost_php, approval_required: required, status,
  })) return NotificationCampaign.findByPk(id);
  kickImmediate(campaign);
  await audit(user, "NOTIFICATION_CAMPAIGN_SUBMITTED", "notification_campaigns", campaign.id,
    { status, recipient_count: prepared.recipient_count, estimated_cost_php: prepared.estimated_cost_php });
  return campaign;
};

const approve = async (id, user, note = "") => {
  const campaign = await NotificationCampaign.findByPk(id);
  if (!campaign) throw AppError.notFound("CAMPAIGN_NOT_FOUND", "Notification not found");
  if (!canApprove(user)) throw AppError.forbidden("Only Registration Team can approve notifications");
  if (campaignStatus(campaign) !== "pending_approval") throw AppError.conflict("INVALID_CAMPAIGN_STATE", "This notification is not waiting for approval");
  if (Number(campaign.created_by) === Number(user.userId)) throw AppError.forbidden("You cannot approve a notification you created");
  const now = new Date();
  if (campaign.timing_mode !== "send_now" && new Date(campaign.window_end) <= now) {
    throw AppError.conflict("CAMPAIGN_EXPIRED", "The delivery window has expired");
  }
  const prepared = await preview({ ...campaign.toJSON(), scheduled_at: campaign.scheduled_at }, user, now);
  if (!prepared.sending_available || !prepared.recipient_count) throw AppError.conflict("SMS_NOT_READY", "SMS processing is unavailable or there are no eligible recipients");
  if (prepared.estimated_cost_php > Math.min(Number(campaign.budget_cap_php ?? Infinity), prepared.monthly_remaining_php)) {
    throw AppError.conflict("CAMPAIGN_BUDGET_EXCEEDED", "The estimated cost exceeds the available budget");
  }
  const timing = campaign.timing_mode === "send_now" ? { scheduled_at: now, window_end: new Date(now.getTime() + 86400000) } : {};
  if (!await transition(campaign, { ...timing, status: "approved", approved_by: user.userId, approved_at: now, rejection_reason: null })) return NotificationCampaign.findByPk(id);
  kickImmediate(campaign);
  await audit(user, "NOTIFICATION_CAMPAIGN_APPROVED", "notification_campaigns", campaign.id, { note });
  return campaign;
};

const reject = async (id, user, reason) => {
  const campaign = await NotificationCampaign.findByPk(id);
  if (!campaign) throw AppError.notFound("CAMPAIGN_NOT_FOUND", "Notification not found");
  if (!canApprove(user)) throw AppError.forbidden("Only Registration Team can reject notifications");
  if (campaignStatus(campaign) !== "pending_approval") throw AppError.conflict("INVALID_CAMPAIGN_STATE", "This notification is not waiting for approval");
  if (Number(campaign.created_by) === Number(user.userId)) throw AppError.forbidden("You cannot review a notification you created");
  if (!await transition(campaign, { status: "rejected", rejected_by: user.userId, rejected_at: new Date(), rejection_reason: reason })) return NotificationCampaign.findByPk(id);
  await audit(user, "NOTIFICATION_CAMPAIGN_REJECTED", "notification_campaigns", campaign.id, { reason });
  return campaign;
};

const cancel = async (id, user, reason = "") => {
  const campaign = await NotificationCampaign.findByPk(id);
  if (!campaign) throw AppError.notFound("CAMPAIGN_NOT_FOUND", "Notification not found");
  assertAudiencePermission(user);
  if (["completed", "cancelled", "rejected"].includes(campaignStatus(campaign))) {
    throw AppError.conflict("INVALID_CAMPAIGN_STATE", "This notification cannot be cancelled");
  }
  if (!await transition(campaign, { status: "cancelled", cancelled_by: user.userId, cancelled_at: new Date(), cancel_reason: reason || null })) return NotificationCampaign.findByPk(id);
  await OutreachDelivery.update({ status: "cancelled", last_error_code: "CAMPAIGN_CANCELLED" },
    { where: { campaign_id: campaign.id, status: { [Op.in]: ["queued", "processing"] } } });
  await audit(user, "NOTIFICATION_CAMPAIGN_CANCELLED", "notification_campaigns", campaign.id, { reason });
  return campaign;
};

const maskPhone = (phone) => {
  const s = String(phone || "").trim();
  if (!s) return "";
  return /^\+?\d{8,}$/.test(s) ? "***" + s.slice(-4) : "***";
};

const list = async ({ page = 1, limit = PAGE_SIZE, status = "", search = "" }, user) => {
  assertCampaignRead(user);
  const where = {};
  if (status) where.status = status;
  const q = String(search || "").trim();
  if (q) {
    where[Op.or] = [
      { title: { [Op.like]: `%${q}%` } },
      { message: { [Op.like]: `%${q}%` } },
    ];
  }
  const capped = Math.min(100, Number(limit) || PAGE_SIZE);
  const currentPage = Math.max(1, Number(page) || 1);
  const result = await NotificationCampaign.findAndCountAll({
    where, order: [["created_at", "DESC"]],
    limit: capped, offset: (currentPage - 1) * capped,
    include: [{ model: User, as: "creator", attributes: ["id", "email"] }],
  });
  return { items: result.rows, total: result.count, page: currentPage, total_pages: Math.max(1, Math.ceil(result.count / capped)) };
};

const get = async (id, user) => {
  const campaign = await NotificationCampaign.findByPk(id, {
    include: [{ model: User, as: "creator", attributes: ["id", "email"] }, { model: User, as: "approver", attributes: ["id", "email"] }],
  });
  if (!campaign) throw AppError.notFound("CAMPAIGN_NOT_FOUND", "Notification not found");
  assertCampaignRead(user);
  const counts = await OutreachDelivery.findAll({
    where: { campaign_id: campaign.id }, attributes: ["status", "channel"], raw: true,
  });
  const summary = counts.reduce((result, row) => {
    const keyName = row.status + "_" + row.channel;
    result[keyName] = (result[keyName] || 0) + 1;
    return result;
  }, {});
  return { campaign, delivery_summary: summary };
};

const deliveries = async (id, { page = 1, limit = 25, search = "" } = {}) => {
  const capped = Math.min(100, Number(limit) || 25);
  const currentPage = Math.max(1, Number(page) || 1);
  const result = await OutreachDelivery.findAndCountAll({
    where: { campaign_id: id }, order: [["id", "ASC"]],
    limit: capped, offset: (currentPage - 1) * capped,
  });
  const memberIds = [...new Set(result.rows.map((r) => Number(r.member_id)).filter(Boolean))];
  const memberMap = new Map();
  if (memberIds.length && Member?.findAll) {
    const members = await Member.findAll({
      where: { id: { [Op.in]: memberIds } },
      attributes: ["id", "first_name", "last_name"],
      raw: true,
    }).catch(() => []);
    for (const m of members) memberMap.set(Number(m.id), `${m.first_name || ""} ${m.last_name || ""}`.trim());
  }
  const q = String(search || "").trim().toLowerCase();
  let items = result.rows.map((row) => {
    const plain = typeof row.toJSON === "function" ? row.toJSON() : { ...row };
    const { claim_token, idempotency_key, ...safe } = plain;
    return {
      ...safe,
      member_name: memberMap.get(Number(plain.member_id)) || `Member #${plain.member_id}`,
      recipient_phone: maskPhone(plain.recipient_phone),
      phone_masked: maskPhone(plain.recipient_phone),
    };
  });
  if (q) {
    items = items.filter((item) =>
      item.member_name.toLowerCase().includes(q) || String(item.status || "").toLowerCase().includes(q)
    );
  }
  return { items, total: result.count, page: currentPage, total_pages: Math.max(1, Math.ceil(result.count / capped)) };
};

const queueCampaign = async (candidate, config, now) => sequelize.transaction(async (transaction) => {
  const campaign = await NotificationCampaign.findByPk(candidate.id, { transaction, lock: transaction.LOCK.UPDATE });
  if (!campaign || !["approved", "scheduled"].includes(campaign.status)) return { campaign_id: candidate.id, queued: 0 };
  if (!canSendCampaignAt(campaign, now, config)) return { campaign_id: campaign.id, queued: 0 };
  const prepared = await previewCampaign({
    audience_type: campaign.audience_type, event_id: campaign.event_id, ministry_id: campaign.ministry_id,
    cell_group_id: campaign.cell_group_id, message: campaign.message, title: campaign.title,
    member_ids: campaign.member_ids,
    activity: await activityFor({ ...campaign.toJSON(), scheduled_at: campaign.scheduled_at }, campaign.scheduled_at),
  }, config, now);
  if (Number(prepared.estimated_cost_php) > Number(campaign.budget_cap_php ?? Infinity)) {
    await campaign.update({ status: "failed" }, { transaction });
    await audit({ userId: campaign.created_by }, "NOTIFICATION_CAMPAIGN_BUDGET_EXCEEDED", "notification_campaigns", campaign.id, {}, transaction);
    return { campaign_id: campaign.id, queued: 0 };
  }
  if (!prepared.recipients.length) {
    await campaign.update({ status: "completed" }, { transaction });
    return { campaign_id: campaign.id, queued: 0 };
  }
  const activity = await activityFor({
    audience_type: campaign.audience_type, event_id: campaign.event_id, title: campaign.title,
  }, campaign.scheduled_at);
  let queued = 0;
  for (const recipient of prepared.recipients) {
    const message = renderCampaignMessage(campaign.message, recipient, activity);
    const [, created] = await OutreachDelivery.findOrCreate({
      where: { idempotency_key: key("campaign", campaign.id, recipient.phone) }, transaction,
      defaults: {
        member_id: recipient.member_id, campaign_id: campaign.id, channel: "sms", kind: "campaign",
        message, recipient_phone: recipient.phone, status: "queued", delivery_mode: config.mode,
        cost_php: Math.round(estimateSegments(message) * Number(config.campaign_unit_cost_php) * 100) / 100,
        scheduled_at: now, expires_at: campaign.window_end, next_attempt_at: now,
      },
    });
    if (created) queued++;
  }
  await campaign.update({ status: "sending", recipient_count: prepared.recipient_count, segment_count: prepared.segment_count, estimated_cost_php: prepared.estimated_cost_php }, { transaction });
  await audit({ userId: campaign.created_by }, "NOTIFICATION_CAMPAIGN_QUEUED", "notification_campaigns", campaign.id, { queued }, transaction);
  return { campaign_id: campaign.id, queued };
});

const queueDueCampaigns = async (now = new Date(), campaignId) => {
  const config = await getConfiguration();
  if (!config.campaigns_enabled) return { queued: 0 };
  await NotificationCampaign.update({ status: "failed" }, { where: { status: { [Op.in]: ["approved", "scheduled"] }, window_end: { [Op.lte]: now } } });
  const campaigns = await NotificationCampaign.findAll({
    where: { ...(campaignId ? { id: campaignId } : {}), status: { [Op.in]: ["approved", "scheduled"] }, scheduled_at: { [Op.lte]: now }, window_end: { [Op.gt]: now } },
    limit: 10,
  });
  let queued = 0;
  for (const campaign of campaigns) {
    if (!canSendCampaignAt(campaign, now, config)) continue;
    const result = await queueCampaign(campaign, config, now);
    queued += result.queued;
  }
  return { queued };
};

const refreshCampaignStatus = async (id) => {
  if (!id) return;
  const campaign = await NotificationCampaign.findByPk(id);
  if (!campaign || !["sending", "approved", "scheduled"].includes(campaignStatus(campaign))) return;
  const rows = await OutreachDelivery.findAll({ where: { campaign_id: id }, attributes: ["status", "cost_php"], raw: true });
  if (!rows.length) return;
  const active = rows.some((row) => ["queued", "processing"].includes(row.status));
  const actual = rows.filter((row) => ["sent", "delivered", "unknown"].includes(row.status))
    .reduce((total, row) => total + (Number(row.cost_php) || 0), 0);
  if (!active) {
    const failed = rows.some((row) => ["failed", "unknown"].includes(row.status));
    await campaign.update({ status: failed ? "failed" : "completed", actual_cost_php: Math.round(actual * 100) / 100 });
  }
};

module.exports = { memberOptions, withinSendWindow, canSendCampaignAt, preview, create, submit, approve, reject, cancel, list, get, deliveries,
  queueDueCampaigns, queueCampaign, refreshCampaignStatus, approvalRequired, monthlyCommitment, activityFor };
