"use strict";

const transactionContext = { LOCK: { UPDATE: "UPDATE" } };

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => callback(transactionContext)),
}));
jest.mock("../src/helpers/scopedLeader.helper", () => ({ getMemberScopeWhere: jest.fn() }));
jest.mock("../src/helpers/cache.helper", () => ({ keys: jest.fn(() => []), del: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn() }));
jest.mock("../src/services/notifications.service", () => ({ createNotification: jest.fn() }));
jest.mock("../src/models", () => ({
  Event: { findOne: jest.fn() },
  EventCategory: {},
  EventRegistration: {
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  Member: { findByPk: jest.fn() },
  User: { findOne: jest.fn() },
  CellGroup: {},
  Group: {},
}));

const sequelize = require("../src/config/db");
const { Event, EventRegistration, Member, User } = require("../src/models");
const notifications = require("../src/services/notifications.service");
const auditLog = require("../src/helpers/auditLog.helper");
const logger = require("../src/helpers/logger");
const eventsService = require("../src/services/events.service");

describe("staff event-registration notifications", () => {
  const event = {
    id: 12,
    title: "QA Community Gathering",
    status: "Upcoming",
    capacity: 25,
    registration_deadline: null,
  };
  const registration = { id: 31, event_id: 12, member_id: 42 };

  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(async (callback) => callback(transactionContext));
    Event.findOne.mockResolvedValue(event);
    EventRegistration.findOne.mockResolvedValue(null);
    EventRegistration.findAll.mockResolvedValue([]);
    EventRegistration.count.mockResolvedValue(0);
    EventRegistration.create.mockResolvedValue(registration);
    Member.findByPk.mockResolvedValue({ id: 42 });
    User.findOne.mockResolvedValue({ id: 9 });
    notifications.createNotification.mockResolvedValue({ id: 55 });
  });

  test("notifies after staff registration commits with an event reference", async () => {
    let committed = false;
    sequelize.transaction.mockImplementation(async (callback) => {
      const result = await callback(transactionContext);
      committed = true;
      return result;
    });
    notifications.createNotification.mockImplementation(async (payload) => {
      expect(committed).toBe(true);
      return { id: 55, ...payload };
    });

    await expect(eventsService.registerMember(12, 42, 7)).resolves.toBe(registration);

    expect(notifications.createNotification).toHaveBeenCalledWith({
      user_id: 9,
      type: "event_registered",
      message: 'You have been successfully registered for "QA Community Gathering".',
      reference_id: 12,
      reference_type: "event",
    });
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ targetId: registration.id }));
  });

  test("notifies after staff removal with an event reference", async () => {
    EventRegistration.findOne.mockResolvedValue({ ...registration, destroy: jest.fn().mockResolvedValue(1) });

    await expect(eventsService.unregisterMember(12, 42, 7)).resolves.toEqual({
      message: "Member unregistered from event successfully.",
    });

    expect(notifications.createNotification).toHaveBeenCalledWith({
      user_id: 9,
      type: "event_unregistered",
      message: 'Your registration for "QA Community Gathering" has been cancelled.',
      reference_id: 12,
      reference_type: "event",
    });
  });

  test("adds the same event reference to every successful bulk registration notice", async () => {
    let committed = false;
    sequelize.transaction.mockImplementation(async (callback) => {
      const result = await callback(transactionContext);
      committed = true;
      return result;
    });
    notifications.createNotification.mockImplementation(async (payload) => {
      expect(committed).toBe(true);
      return { id: 55, ...payload };
    });

    await expect(eventsService.bulkRegisterMembers(12, [42], 7)).resolves.toMatchObject({
      registered: [42],
      skipped: [],
      errors: [],
    });

    expect(notifications.createNotification).toHaveBeenCalledWith({
      user_id: 9,
      type: "event_registered",
      message: 'You have been registered for "QA Community Gathering".',
      reference_id: 12,
      reference_type: "event",
    });
  });

  test("keeps registration committed when a staff notification fails", async () => {
    notifications.createNotification.mockRejectedValue(new Error("notification unavailable"));

    await expect(eventsService.registerMember(12, 42, 7)).resolves.toBe(registration);
    expect(EventRegistration.create).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(expect.any(Error), "Register notification failed:");
  });
});
