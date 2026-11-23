"use strict";

const mockState = {};
jest.mock("../src/config/db", () => ({ transaction: jest.fn(async (callback) => callback({})), getQueryInterface: jest.fn() }));
jest.mock("../src/models", () => ({
  Event: { findByPk: jest.fn() },
  User: {},
}));
jest.mock("../src/modules/outreach/models", () => ({
  NotificationCampaign: {
    create: jest.fn(), findByPk: jest.fn(), findAll: jest.fn(), findAndCountAll: jest.fn(),
  },
  OutreachDelivery: { findOrCreate: jest.fn(), findAll: jest.fn(), update: jest.fn() },
}));
jest.mock("../src/modules/outreach/configuration", () => ({ getConfiguration: jest.fn() }));
jest.mock("../src/modules/outreach/audience", () => ({ previewCampaign: jest.fn() }));
jest.mock("../src/modules/outreach/permissions", () => ({
  CAMPAIGN_ROLES: ["System Admin", "Pastor", "Ministry Leader", "Registration Team"],
  canBroadcast: (user) => ["System Admin", "Pastor"].includes(user.roleName),
  canApprove: (user) => ["System Admin", "Pastor"].includes(user.roleName),
}));
jest.mock("../src/modules/outreach/repository", () => ({ audit: jest.fn() }));

const { NotificationCampaign, OutreachDelivery } = require("../src/modules/outreach/models");
const { Event } = require("../src/models");
const { getConfiguration } = require("../src/modules/outreach/configuration");
const { previewCampaign } = require("../src/modules/outreach/audience");
const campaigns = require("../src/modules/outreach/campaigns.service");

const config = {
  campaigns_enabled: true, campaign_unit_cost_php: 0.463, campaign_monthly_budget_php: 100,
  campaign_weekly_member_cap: 2, campaign_monthly_member_cap: 6,
  campaign_approval_recipient_threshold: 50, campaign_approval_cost_threshold: 50,
  campaign_quiet_start: 0, campaign_quiet_end: 24,
};
const admin = { userId: 1, roleName: "System Admin" };
const pastor = { userId: 2, roleName: "Pastor" };
const preview = {
  recipient_count: 2, segment_count: 1, estimated_cost_php: 0.93, monthly_remaining_php: 99,
  approval_required: false, recipients: [], excluded: {}, warning: null,
};

beforeEach(() => {
  jest.clearAllMocks();
  mockState.campaign = {
    id: 5, status: "draft", audience_type: "event", event_id: 1, ministry_id: null, cell_group_id: null,
    message: "Hi {{first_name}}, join us. PLWM-MCC", title: "Event reminder",
    scheduled_at: new Date("2099-10-16T01:00:00Z"), window_end: new Date("2099-10-17T01:00:00Z"),
    created_by: 1, estimated_cost_php: 0.93, recipient_count: 2,
    update: jest.fn(async (values) => Object.assign(mockState.campaign, values)),
    toJSON() { return { ...this, update: undefined, toJSON: undefined }; },
  };
  Event.findByPk.mockResolvedValue({ id: 1, title: "Community Gathering", start_date: "2099-10-18", start_time: "09:00", location: "Hall", status: "Upcoming" });
  getConfiguration.mockResolvedValue(config);
  previewCampaign.mockResolvedValue(preview);
  NotificationCampaign.create.mockImplementation(async (values) => ({ id: 5, ...values }));
  NotificationCampaign.findAll.mockResolvedValue([]);
  NotificationCampaign.findByPk.mockImplementation(async () => mockState.campaign);
});

test("all-member campaigns require a broadcast role", async () => {
  await expect(campaigns.preview({
    audience_type: "all_members", message: "Hello all members",
  }, { userId: 3, roleName: "Ministry Leader" })).rejects.toMatchObject({ status: 403 });
});

test("create stores an event campaign with cost and no approval when under threshold", async () => {
  const result = await campaigns.create({
    title: "Event reminder", audience_type: "event", event_id: 1,
    message: "Hi {{first_name}}, join us. PLWM-MCC",
    scheduled_at: "2099-10-16T01:00:00+08:00",
  }, admin);
  expect(previewCampaign).toHaveBeenCalled();
  expect(NotificationCampaign.create).toHaveBeenCalledWith(expect.objectContaining({
    title: "Event reminder", audience_type: "event", recipient_count: 2,
    estimated_cost_php: 0.93, approval_required: false, status: "draft",
  }));
  expect(result.id).toBe(5);
});

test("submit moves a required approval campaign to pending_approval", async () => {
  previewCampaign.mockResolvedValue({ ...preview, recipient_count: 200 });
  const result = await campaigns.submit(5, admin);
  expect(result.status).toBe("pending_approval");
  expect(result.approval_required).toBe(true);
});

test("approve rejects the creator approving their own campaign", async () => {
  mockState.campaign.status = "pending_approval";
  mockState.campaign.created_by = 1;
  await expect(campaigns.approve(5, admin)).rejects.toMatchObject({ status: 403 });
});

test("a different approver can approve a pending campaign", async () => {
  mockState.campaign.status = "pending_approval";
  mockState.campaign.created_by = 1;
  const result = await campaigns.approve(5, pastor, "Looks good");
  expect(result.status).toBe("approved");
  expect(result.approved_by).toBe(2);
});

test("cancel cancels queued deliveries and closes the campaign", async () => {
  mockState.campaign.status = "scheduled";
  await campaigns.cancel(5, admin, "Event moved");
  expect(OutreachDelivery.update).toHaveBeenCalledWith(
    expect.objectContaining({ status: "cancelled" }),
    expect.objectContaining({ where: expect.objectContaining({ campaign_id: 5 }) }),
  );
  expect(mockState.campaign.status).toBe("cancelled");
});

test("queueCampaign creates one delivery per recipient with campaign idempotency", async () => {
  previewCampaign.mockResolvedValue({
    ...preview,
    recipients: [
      { member_id: 1, first_name: "Alex", last_name: "Sample", name: "Alex", phone: "+639171234567" },
      { member_id: 2, first_name: "Jamie", last_name: "Example", name: "Jamie", phone: "+639171234568" },
    ],
  });
  OutreachDelivery.findOrCreate.mockResolvedValue([{}, true]);
  const result = await campaigns.queueCampaign(mockState.campaign, config, new Date("2099-10-16T01:00:00Z"));
  expect(result.queued).toBe(2);
  expect(OutreachDelivery.findOrCreate).toHaveBeenCalledTimes(2);
  expect(OutreachDelivery.findOrCreate).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ idempotency_key: expect.any(String) }),
    defaults: expect.objectContaining({ campaign_id: 5, kind: "campaign", channel: "sms" }),
  }));
});
