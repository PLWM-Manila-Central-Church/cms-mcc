"use strict";

const mockState = {};

jest.mock("../src/models", () => ({
  Notification: {
    create: jest.fn(async (values) => ({ id: 7, ...values })),
    bulkCreate: jest.fn(async (records) => records),
    findAll: jest.fn(),
    findOne: jest.fn(),
  },
  User: { findAll: jest.fn(async () => mockState.recipients) },
  SystemSetting: { findOne: jest.fn(async () => mockState.preference) },
}));
jest.mock("../src/utils/mailer", () => ({ sendNotification: jest.fn(async () => ({ messageId: "mock" })) }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn() }));

const { Notification, User, SystemSetting } = require("../src/models");
const mailer = require("../src/utils/mailer");
const notifications = require("../src/services/notifications.service");

describe("optional notification email delivery", () => {
  const originalEnv = {
    enabled: process.env.EMAIL_NOTIFICATION_DELIVERY_ENABLED,
    key: process.env.BREVO_API_KEY,
    sender: process.env.SMTP_FROM,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EMAIL_NOTIFICATION_DELIVERY_ENABLED = "false";
    delete process.env.BREVO_API_KEY;
    delete process.env.SMTP_FROM;
    mockState.preference = { value: "true" };
    mockState.recipients = [{ id: 1, email: "qa-one@example.com" }];
  });

  afterAll(() => {
    if (originalEnv.enabled === undefined) delete process.env.EMAIL_NOTIFICATION_DELIVERY_ENABLED;
    else process.env.EMAIL_NOTIFICATION_DELIVERY_ENABLED = originalEnv.enabled;
    if (originalEnv.key === undefined) delete process.env.BREVO_API_KEY;
    else process.env.BREVO_API_KEY = originalEnv.key;
    if (originalEnv.sender === undefined) delete process.env.SMTP_FROM;
    else process.env.SMTP_FROM = originalEnv.sender;
  });

  test("keeps email delivery disabled unless the deployment kill switch is enabled", async () => {
    await notifications.createNotification({ user_id: 1, type: "test", message: "A QA notification" });
    expect(Notification.create).toHaveBeenCalledTimes(1);
    expect(SystemSetting.findOne).not.toHaveBeenCalled();
    expect(User.findAll).not.toHaveBeenCalled();
    expect(mailer.sendNotification).not.toHaveBeenCalled();
  });

  test("sends email only when both the deployment flag and admin setting permit it", async () => {
    process.env.EMAIL_NOTIFICATION_DELIVERY_ENABLED = "true";
    process.env.BREVO_API_KEY = "mock-api-key";
    process.env.SMTP_FROM = "PLWM-MCC <qa@example.com>";
    mockState.recipients = [
      { id: 1, email: "qa-one@example.com" },
      { id: 2, email: "qa-two@example.com" },
    ];

    await notifications.bulkCreateNotifications([1, 2, 1], { type: "test", message: "A QA broadcast" });

    expect(User.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ is_active: 1, is_deleted: 0 }),
    }));
    expect(mailer.sendNotification).toHaveBeenCalledTimes(2);
    expect(mailer.sendNotification).toHaveBeenNthCalledWith(1, { to: "qa-one@example.com", message: "A QA broadcast" });
    expect(mailer.sendNotification).toHaveBeenNthCalledWith(2, { to: "qa-two@example.com", message: "A QA broadcast" });
  });

  test("respects the admin email-notification setting even when the deployment permits delivery", async () => {
    process.env.EMAIL_NOTIFICATION_DELIVERY_ENABLED = "true";
    process.env.BREVO_API_KEY = "mock-api-key";
    process.env.SMTP_FROM = "PLWM-MCC <qa@example.com>";
    mockState.preference = { value: "false" };

    await notifications.createNotification({ user_id: 1, type: "test", message: "A QA notification" });

    expect(mailer.sendNotification).not.toHaveBeenCalled();
  });

  test.each([
    ["service", 12, "Morning Service", "attendance_service_recorded", "service"],
    ["event", 34, "Church Gathering", "attendance_event_recorded", "event"],
  ])("records an in-app notification for %s attendance", async (activityType, activityId, activityTitle, expectedType, referenceType) => {
    mockState.recipients = [{ id: 27 }];

    await notifications.notifyAttendanceRecorded({
      memberId: 81,
      activityType,
      activityId,
      activityTitle,
    });

    expect(User.findAll).toHaveBeenCalledWith({
      where: { member_id: 81, is_active: 1, is_deleted: 0 },
      attributes: ["id"],
    });
    expect(Notification.bulkCreate).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({
        user_id: 27,
        type: expectedType,
        message: `Your attendance was recorded for ${activityTitle}.`,
        reference_id: activityId,
        reference_type: referenceType,
      })]),
      { ignoreDuplicates: true },
    );
  });
});
