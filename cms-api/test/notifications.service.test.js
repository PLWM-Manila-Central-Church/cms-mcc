"use strict";

const mockState = {};

jest.mock("../src/models", () => ({
  Notification: {
    create: jest.fn(async (values) => ({ id: 7, ...values })),
    bulkCreate: jest.fn(async (records) => records),
    findAll: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(async () => [1]),
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


describe("historic inventory notification visibility", () => {
  const { Op } = require("sequelize");
  test("Member lists suppress old operational notices while leaving requester types visible", async () => {
    Notification.findAll.mockClear();
    Notification.findAll.mockResolvedValue([]);
    await notifications.getUserNotifications(27, "Member");
    await notifications.getUnreadNotifications(27, "Member");
    const scope = { user_id: 27, type: { [Op.notIn]: ["inventory_item_low_stock", "inventory_item_out_of_stock", "inventory_item_under_repair", "inventory_item_available"] } };
    expect(Notification.findAll).toHaveBeenNthCalledWith(1, { where: scope, order: [["created_at", "DESC"]] });
    expect(Notification.findAll).toHaveBeenNthCalledWith(2, { where: { ...scope, is_read: 0 }, order: [["created_at", "DESC"]] });
  });
  test("Admin retains operational notices within its account", async () => {
    Notification.findAll.mockClear();
    await notifications.getUserNotifications(1, "System Admin");
    expect(Notification.findAll).toHaveBeenCalledWith({ where: { user_id: 1 }, order: [["created_at", "DESC"]] });
  });

  test("archives one notification with actor metadata instead of deleting it", async () => {
    const update = jest.fn(async (values) => values);
    Notification.findOne.mockResolvedValue({ update });
    await notifications.archiveNotification(8, 27, "Member");
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: 1, deleted_by: 27, deleted_at: expect.any(Date) }));
  });

  test("archives all scoped notifications with one retained-state update", async () => {
    await notifications.archiveAllNotifications(27, "Member");
    expect(Notification.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_deleted: 1, deleted_by: 27, deleted_at: expect.any(Date) }),
      expect.objectContaining({ where: { user_id: 27, type: { [Op.notIn]: [
        "inventory_item_low_stock", "inventory_item_out_of_stock", "inventory_item_under_repair", "inventory_item_available",
      ] } } }),
    );
  });
});
