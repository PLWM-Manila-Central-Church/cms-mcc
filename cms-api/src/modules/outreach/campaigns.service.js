"use strict";

const { Op } = require("sequelize");
const AppError = require("../../helpers/AppError");
const { Event, User } = require("../../models");
const { OutreachDelivery, NotificationCampaign } = require("./models");
const { getConfiguration } = require("./configuration");
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

const assertAudiencePermission = (user, input) => {
  if (!CAMPAIGN_ROLES.includes(user?.roleName)) throw AppError.forbidden("You cannot create notifications");
  if (input.audience_type === "all_members" && !canBroadcast(user)) {
    throw AppError.forbidden("Only a System Admin or Pastor can notify all members");
  }
  if (input.audience_type === "ministry" && user.roleName === "Ministry Leader"
    && Number(user.leadsMinistryId) !== Number(input.ministry_id)) {
    throw AppError.forbidden("You can only notify your assigned ministry");
  }
  if (input.audience_type === "cell_group" && !["System Admin", "Pastor"].includes(user.roleName)) {
    const allowed = (user.leaderAssignments || []).some((assignment) =>
      assignment.scopeType === "cell_group" && Number(assignment.scopeId) === Number(input.cell_group_id));
    if (!allowed) throw AppError.forbidden("You can only notify your assigned cell group");
  }
};

const assertOwnerOrAdmin = (campaign, user) => {
  if (Number(campaign.created_by) !== Number(user.userId) && !["System Admin", "Pastor"].includes(user.roleName)) {
    throw AppError.forbidden("You cannot change this notification");
  }
};

const quietHour = (scheduledAt) => Number(new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Manila", hour: "2-digit", hour12: false,
}).format(new Date(scheduledAt)));

const assertSendWindow = (scheduledAt, config) => {
  const hour = quietHour(scheduledAt);
  if (hour < Number(config.campaign_quiet_start) || hour >= Number(config.campaign_quiet_end)) {
    throw AppError.badRequest("OUTSIDE_SEND_WINDOW",
      `Schedule between ${config.campaign_quiet_start}:00 and ${config.campaign_quiet_end}:00 Asia/Manila`);
  }
};

const monthlyCommitment = async (now = new Date()) => {
  const start = new Date(now.getTime() - MONTH);
  const rows = await NotificationCampaign.findAll({
    where: { status: { [Op.in]: ["approved", "scheduled", "sending"] }, created_at: { [Op.gte]: start } },
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
  const activity = await activityFor(input, input.scheduled_at || now);
  const result = await previewCampaign({ ...input, activity }, config, now);
  result.approval_required = approvalRequired({ ...result, audience_type: input.audience_type }, config);
  result.monthly_committed_php = await monthlyCommitment(now);
  result.monthly_remaining_php = Math.max(0, Math.round((Number(config.campaign_monthly_budget_php) - result.monthly_committed_php) * 100) / 100);
  return {
    ...result,
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
  const scheduledAt = new Date(input.scheduled_at);
  if (Number.isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
    throw AppError.badRequest("INVALID_SCHEDULE", "Choose a future send time");
  }
  assertSendWindow(scheduledAt, config);
  const prepared = await preview({ ...input, scheduled_at: scheduledAt.toISOString() }, user);
  if (!prepared.recipient_count) throw AppError.conflict("NO_RECIPIENTS", prepared.warning || "No eligible recipients for this audience");
  if (prepared.estimated_cost_php > prepared.monthly_remaining_php) {
    throw AppError.conflict("MONTHLY_BUDGET_EXCEEDED", "This notification exceeds the remaining monthly SMS budget");
  }
  const budgetCap = input.budget_cap_php == null ? prepared.estimated_cost_php : Number(input.budget_cap_php);
  if (prepared.estimated_cost_php > budgetCap) throw AppError.conflict("CAMPAIGN_BUDGET_EXCEEDED", "The estimated cost exceeds this notification's budget");
  const windowEnd = input.window_end ? new Date(input.window_end) : new Date(scheduledAt.getTime() + 24 * 3600000);
  const campaign = await NotificationCampaign.create({
    title: input.title, audience_type: input.audience_type,
    event_id: input.event_id || null, ministry_id: input.ministry_id || null, cell_group_id: input.cell_group_id || null,
    message: input.message, scheduled_at: scheduledAt, window_end: windowEnd,
    recipient_count: prepared.recipient_count, segment_count: prepared.segment_count,
    estimated_cost_php: prepared.estimated_cost_php, budget_cap_php: budgetCap,
    approval_required: prepared.approval_required, status: "draft", created_by: user.userId,
  });
  await audit(user, "NOTIFICATION_CAMPAIGN_CREATED", "notification_campaigns", campaign.id,
    { title: campaign.title, audience_type: campaign.audience_type, recipient_count: campaign.recipient_count });
  return campaign;
};

const submit = async (id, user) => {
  const campaign = await NotificationCampaign.findByPk(id);
  if (!campaign) throw AppError.notFound("CAMPAIGN_NOT_FOUND", "Notification not found");
  if (campaignStatus(campaign) !== "draft") throw AppError.conflict("INVALID_CAMPAIGN_STATE", "Only a draft can be submitted");
  assertOwnerOrAdmin(campaign, user);
  const prepared = await preview({
    audience_type: campaign.audience_type, event_id: campaign.event_id, ministry_id: campaign.ministry_id,
    cell_group_id: campaign.cell_group_id, message: campaign.message, title: campaign.title,
    scheduled_at: campaign.scheduled_at,
  }, user);
  if (!prepared.recipient_count) throw AppError.conflict("NO_RECIPIENTS", prepared.warning || "No eligible recipients for this audience");
  if (prepared.estimated_cost_php > prepared.monthly_remaining_php) {
    throw AppError.conflict("MONTHLY_BUDGET_EXCEEDED", "This notification exceeds the remaining monthly SMS budget");
  }
  const required = approvalRequired({ ...prepared, audience_type: campaign.audience_type },
    await getConfiguration());
  const status = required ? "pending_approval" : "approved";
  await campaign.update({
    recipient_count: prepared.recipient_count, segment_count: prepared.segment_count,
    estimated_cost_php: prepared.estimated_cost_php, approval_required: required, status,
  });
  await audit(user, "NOTIFICATION_CAMPAIGN_SUBMITTED", "notification_campaigns", campaign.id,
    { status, recipient_count: prepared.recipient_count, estimated_cost_php: prepared.estimated_cost_php });
  return campaign;
};

const approve = async (id, user, note = "") => {
  const campaign = await NotificationCampaign.findByPk(id);
  if (!campaign) throw AppError.notFound("CAMPAIGN_NOT_FOUND", "Notification not found");
  if (!canApprove(user)) throw AppError.forbidden("Only a System Admin or Pastor can approve notifications");
  if (campaignStatus(campaign) !== "pending_approval") throw AppError.conflict("INVALID_CAMPAIGN_STATE", "This notification is not waiting for approval");
  if (Number(campaign.created_by) === Number(user.userId)) throw AppError.forbidden("You cannot approve a notification you created");
  await campaign.update({ status: "approved", approved_by: user.userId, approved_at: new Date(), rejection_reason: null });
  await audit(user, "NOTIFICATION_CAMPAIGN_APPROVED", "notification_campaigns", campaign.id, { note });
  return campaign;
};

const reject = async (id, user, reason) => {
  const campaign = await NotificationCampaign.findByPk(id);
  if (!campaign) throw AppError.notFound("CAMPAIGN_NOT_FOUND", "Notification not found");
  if (!canApprove(user)) throw AppError.forbidden("Only a System Admin or Pastor can reject notifications");
  if (campaignStatus(campaign) !== "pending_approval") throw AppError.conflict("INVALID_CAMPAIGN_STATE", "This notification is not waiting for approval");
  await campaign.update({ status: "rejected", rejected_by: user.userId, rejected_at: new Date(), rejection_reason: reason });
  await audit(user, "NOTIFICATION_CAMPAIGN_REJECTED", "notification_campaigns", campaign.id, { reason });
  return campaign;
};

const cancel = async (id, user, reason = "") => {
  const campaign = await NotificationCampaign.findByPk(id);
  if (!campaign) throw AppError.notFound("CAMPAIGN_NOT_FOUND", "Notification not found");
  assertOwnerOrAdmin(campaign, user);
  if (["completed", "cancelled", "rejected"].includes(campaignStatus(campaign))) {
    throw AppError.conflict("INVALID_CAMPAIGN_STATE", "This notification cannot be cancelled");
  }
  await campaign.update({ status: "cancelled", cancelled_by: user.userId, cancelled_at: new Date(), cancel_reason: reason || null });
  await OutreachDelivery.update({ status: "cancelled", last_error_code: "CAMPAIGN_CANCELLED" },
    { where: { campaign_id: campaign.id, status: { [Op.in]: ["queued", "processing"] } } });
  await audit(user, "NOTIFICATION_CAMPAIGN_CANCELLED", "notification_campaigns", campaign.id, { reason });
  return campaign;
};

const list = async ({ page = 1, limit = PAGE_SIZE, status = "" }, user) => {
  const where = {};
  if (status) where.status = status;
  if (!["System Admin", "Pastor", "Registration Team"].includes(user.roleName)) {
    where.created_by = user.userId;
  }
  const result = await NotificationCampaign.findAndCountAll({
    where, order: [["created_at", "DESC"]],
    limit: Math.min(100, Number(limit) || PAGE_SIZE), offset: (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit) || PAGE_SIZE),
    include: [{ model: User, as: "creator", attributes: ["id", "email"] }],
  });
  return { items: result.rows, total: result.count, page: Number(page), total_pages: Math.ceil(result.count / Math.min(100, Number(limit) || PAGE_SIZE)) };
};

const get = async (id, user) => {
  const campaign = await NotificationCampaign.findByPk(id, {
    include: [{ model: User, as: "creator", attributes: ["id", "email"] }, { model: User, as: "approver", attributes: ["id", "email"] }],
  });
  if (!campaign) throw AppError.notFound("CAMPAIGN_NOT_FOUND", "Notification not found");
  if (!["System Admin", "Pastor", "Registration Team"].includes(user.roleName) && Number(campaign.created_by) !== Number(user.userId)) {
    throw AppError.forbidden("You cannot view this notification");
  }
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

const deliveries = async (id, { page = 1, limit = 50 } = {}) => {
  const result = await OutreachDelivery.findAndCountAll({
    where: { campaign_id: id }, order: [["id", "ASC"]],
    limit: Math.min(100, Number(limit) || 50), offset: (Math.max(1, Number(page)) - 1) * Math.min(100, Number(limit) || 50),
  });
  return { items: result.rows, total: result.count, page: Number(page), total_pages: Math.ceil(result.count / Math.min(100, Number(limit) || 50)) };
};

const queueCampaign = async (campaign, config, now) => {
  const prepared = await previewCampaign({
    audience_type: campaign.audience_type, event_id: campaign.event_id, ministry_id: campaign.ministry_id,
    cell_group_id: campaign.cell_group_id, message: campaign.message, title: campaign.title,
    activity: await activityFor({ ...campaign.toJSON(), scheduled_at: campaign.scheduled_at }, campaign.scheduled_at),
  }, config, now);
  if (!prepared.recipients.length) {
    await campaign.update({ status: "completed" });
    return { campaign_id: campaign.id, queued: 0 };
  }
  const activity = await activityFor({
    audience_type: campaign.audience_type, event_id: campaign.event_id, title: campaign.title,
  }, campaign.scheduled_at);
  let queued = 0;
  for (const recipient of prepared.recipients) {
    const message = renderCampaignMessage(campaign.message, recipient, activity);
    const [, created] = await OutreachDelivery.findOrCreate({
      where: { idempotency_key: key("campaign", campaign.id, recipient.phone) },
      defaults: {
        member_id: recipient.member_id, campaign_id: campaign.id, channel: "sms", kind: "campaign",
        message, recipient_phone: recipient.phone, status: "queued", delivery_mode: config.mode,
        cost_php: Math.round(estimateSegments(message) * Number(config.campaign_unit_cost_php) * 100) / 100,
        scheduled_at: now, expires_at: campaign.window_end, next_attempt_at: now,
      },
    });
    if (created) queued++;
  }
  await campaign.update({ status: "sending", recipient_count: prepared.recipient_count, segment_count: prepared.segment_count, estimated_cost_php: prepared.estimated_cost_php });
  await audit({ userId: campaign.created_by }, "NOTIFICATION_CAMPAIGN_QUEUED", "notification_campaigns", campaign.id, { queued });
  return { campaign_id: campaign.id, queued };
};

const queueDueCampaigns = async (now = new Date()) => {
  const config = await getConfiguration();
  if (!config.campaigns_enabled) return { queued: 0 };
  const campaigns = await NotificationCampaign.findAll({
    where: { status: { [Op.in]: ["approved", "scheduled"] }, scheduled_at: { [Op.lte]: now }, window_end: { [Op.gt]: now } },
    limit: 10,
  });
  let queued = 0;
  for (const campaign of campaigns) {
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

module.exports = { preview, create, submit, approve, reject, cancel, list, get, deliveries,
  queueDueCampaigns, queueCampaign, refreshCampaignStatus, approvalRequired, monthlyCommitment, activityFor };
