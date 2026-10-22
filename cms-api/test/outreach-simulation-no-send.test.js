"use strict";

const state = {};
const transaction = { LOCK: { UPDATE: "UPDATE" } };

jest.mock("../src/config/db", () => ({ transaction: jest.fn(async (callback) => callback(transaction)) }));
jest.mock("../src/models", () => ({
  Member: { findByPk: jest.fn(async () => state.member) },
  User: { findOne: jest.fn() },
  Notification: { create: jest.fn() },
  SystemSetting: { findOrCreate: jest.fn() },
}));
jest.mock("../src/modules/qr-attendance/sessions.service", () => ({
  getSessionWithParent: jest.fn(async () => state.session),
}));
jest.mock("../src/modules/outreach/configuration", () => ({
  getConfiguration: jest.fn(),
  transportState: () => ({ sms_delivery_enabled: false, provider_configured: false, recipient_restriction_configured: false }),
}));
jest.mock("../src/modules/outreach/policy", () => ({
  normalizePhone: (phone) => phone,
  hasSmsConsent: () => true,
  findAbsenceEpisode: jest.fn(),
  reminderIsDue: () => true,
  renderMessage: () => "Simulation-only reminder",
  estimateSegments: () => 1,
}));
jest.mock("../src/modules/outreach/evaluation", () => ({ historyForMembers: jest.fn(), evaluatePage: jest.fn(), notifyAssignee: jest.fn() }));
jest.mock("../src/modules/outreach/repository", () => ({
  OutreachPreference: { findOne: jest.fn(async () => state.preference) },
  OutreachSessionPolicy: { findOne: jest.fn(async () => state.policy) },
  AttendanceFollowUp: { findByPk: jest.fn() },
  OutreachDelivery: { findByPk: jest.fn(async () => state.job) },
  OutreachDeliveryAttempt: { create: jest.fn(async () => state.attempt) },
  audienceIds: jest.fn(async () => [7]),
  audit: jest.fn(),
}));
jest.mock("../src/modules/outreach/mocean.transport", () => ({
  send: jest.fn(),
  queryStatus: jest.fn(),
}));
jest.mock("../src/helpers/AppError", () => ({
  notFound: jest.fn(), conflict: jest.fn(), badRequest: jest.fn(), forbidden: jest.fn(),
}));

const { processClaim } = require("../src/modules/outreach/dispatcher");
const provider = require("../src/modules/outreach/mocean.transport");

describe("SMS simulation delivery", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const now = new Date();
    state.member = { id: 7, first_name: "QA", last_name: "Member", status: "Active", phone: "+639171234567" };
    state.preference = { member_id: 7, sms_enabled: true, consent_at: now, consent_phone: "+639171234567", activity_reminders: true };
    state.policy = { session_id: 13, reminders_enabled: true, reminders_enabled_at: now };
    state.session = { id: 13, service_id: null, event_id: 13, status: "open", target: { status: "Upcoming", title: "QA Gathering" } };
    state.job = {
      id: 41, status: "processing", claim_token: "claim-41", channel: "sms", kind: "activity_reminder",
      member_id: 7, session_id: 13, reminder_days: 1, recipient_phone: "+639171234567",
      expires_at: new Date(now.getTime() + 60_000).toISOString(),
      attempt_count: 0, update: jest.fn(async (values) => Object.assign(state.job, values)),
    };
    state.attempt = { id: 9, update: jest.fn(async () => {}) };
  });

  test("records a simulated SMS delivery without calling the provider", async () => {
    await processClaim({ id: 41, claim_token: "claim-41" }, {
      enabled: true,
      mode: "simulation",
      reminder_days: [1],
      reminder_template: "test",
      followup_template: "test",
    }, new Date());

    expect(state.job.update).toHaveBeenCalledWith(expect.objectContaining({ delivery_mode: "simulation" }), { transaction });
    expect(state.job.update).toHaveBeenCalledWith(expect.objectContaining({ status: "simulated", sent_at: null }), { transaction });
    expect(state.attempt.update).toHaveBeenCalledWith(expect.objectContaining({ status: "simulated" }), { transaction });
    expect(provider.send).not.toHaveBeenCalled();
    expect(provider.queryStatus).not.toHaveBeenCalled();
  });
});
