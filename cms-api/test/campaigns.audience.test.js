"use strict";

jest.mock("../src/models", () => ({
  Member: { findAll: jest.fn() },
  EventRegistration: { findAll: jest.fn() },
  MinistryMembership: { findAll: jest.fn() },
}));
jest.mock("../src/modules/outreach/models", () => ({
  OutreachPreference: { findAll: jest.fn() },
  OutreachDelivery: { findAll: jest.fn() },
}));

const { Member } = require("../src/models");
const { OutreachPreference, OutreachDelivery } = require("../src/modules/outreach/models");
const { resolveAudience, previewCampaign, ageAt } = require("../src/modules/outreach/audience");

const config = {
  campaign_weekly_member_cap: 2, campaign_monthly_member_cap: 6,
  campaign_unit_cost_php: 0.463,
};
const member = (values) => ({
  id: 1, first_name: "Alex", last_name: "Sample", phone: "+639171234567",
  birthdate: "1990-01-01", status: "Active", is_deleted: 0, ...values,
});
const preference = (values) => ({
  member_id: 1, sms_enabled: true, consent_at: new Date(), consent_phone: "+639171234567",
  opted_out_at: null, campaign_notifications: true, ...values,
});

beforeEach(() => {
  jest.clearAllMocks();
  OutreachDelivery.findAll.mockResolvedValue([]);
  Member.findAll.mockResolvedValue([member()]);
  OutreachPreference.findAll.mockResolvedValue([preference()]);
});

test("counts an adult with matching consent as eligible", async () => {
  const result = await resolveAudience({ audience_type: "all_members" }, config);
  expect(result.recipients).toHaveLength(1);
  expect(result.recipients[0]).toMatchObject({ member_id: 1, phone: "+639171234567", is_minor: false });
});

test("excludes a member without consent", async () => {
  OutreachPreference.findAll.mockResolvedValue([preference({ sms_enabled: false })]);
  const result = await resolveAudience({ audience_type: "all_members" }, config);
  expect(result.recipients).toHaveLength(0);
  expect(result.excluded.no_consent).toBe(1);
});

test("explains selected recipient results without returning contact data in the status rows", async () => {
  Member.findAll.mockResolvedValue([member({}), member({ id: 2 })]);
  OutreachPreference.findAll.mockResolvedValue([preference({}), preference({ member_id: 2, sms_enabled: false })]);
  const result = await resolveAudience({ audience_type: "selected_members", member_ids: [1, 2, 3] }, config);
  expect(result.recipient_status).toEqual(expect.arrayContaining([
    { member_id: 1, reason: null },
    { member_id: 2, reason: "no_consent" },
    { member_id: 3, reason: "not_found" },
  ]));
  expect(result.recipients.map(({ member_id }) => member_id)).toEqual([1]);
});

test("routes a minor to a consented guardian number", async () => {
  Member.findAll.mockResolvedValue([member({ birthdate: "2012-01-01" })]);
  OutreachPreference.findAll.mockResolvedValue([preference({
    consent_phone: "+639181234567", guardian_name: "Parent Sample", guardian_phone: "+639181234567",
    guardian_consent_at: new Date(),
  })]);
  const result = await resolveAudience({ audience_type: "all_members" }, config);
  expect(result.recipients).toHaveLength(1);
  expect(result.recipients[0]).toMatchObject({ phone: "+639181234567", is_minor: true, name: "Parent Sample" });
});

test("excludes a minor with no guardian consent", async () => {
  Member.findAll.mockResolvedValue([member({ birthdate: "2012-01-01" })]);
  OutreachPreference.findAll.mockResolvedValue([preference()]);
  const result = await resolveAudience({ audience_type: "all_members" }, config);
  expect(result.recipients).toHaveLength(0);
  expect(result.excluded.minor_without_guardian).toBe(1);
});

test("deduplicates shared household numbers", async () => {
  Member.findAll.mockResolvedValue([
    member({ id: 1 }),
    member({ id: 2, first_name: "Jamie", phone: "+639171234567" }),
  ]);
  OutreachPreference.findAll.mockResolvedValue([
    preference({ member_id: 1 }),
    preference({ member_id: 2 }),
  ]);
  const result = await resolveAudience({ audience_type: "all_members" }, config);
  expect(result.recipients).toHaveLength(1);
  expect(result.excluded.duplicate).toBe(1);
});

test("preview reports recipient count, segments and estimated cost", async () => {
  const result = await previewCampaign({ audience_type: "all_members", message: "Hi {{first_name}}, see you at church. PLWM-MCC" }, config);
  expect(result.recipient_count).toBe(1);
  expect(result.estimated_cost_php).toBe(0.46);
});

test("age calculation handles birthdays", () => {
  expect(ageAt("2012-01-01", new Date("2026-11-23T00:00:00Z"))).toBe(14);
  expect(ageAt(null)).toBeNull();
});
