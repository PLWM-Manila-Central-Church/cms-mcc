"use strict";

jest.mock("../src/config/db", () => ({ transaction: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/attendanceSummary.helper", () => ({
  getAttendanceModel: jest.fn(),
  syncServiceAttendanceSummary: jest.fn(),
}));
jest.mock("../src/helpers/serviceResponseReservation.helper", () => ({ saveServiceResponse: jest.fn() }));
jest.mock("../src/models", () => ({
  Member: {},
  CellGroup: {},
  Group: {},
  EmergencyContact: {},
  Attendance: {},
  Service: {},
  ServiceResponse: {},
  ServiceAttendanceSummary: {},
  FinancialRecord: {},
  FinancialCategory: {},
  Event: { findOne: jest.fn(), findAll: jest.fn() },
  EventRegistration: {
    findOne: jest.fn(),
    unscoped: jest.fn(function unscoped() { return this; }),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  },
  EventCategory: {},
  Member: { findByPk: jest.fn() },
  MinistryAssignment: {},
  MinistryRole: {},
  MinistryEventInvite: {},
  Notification: {},
  User: { findOne: jest.fn() },
  RefreshToken: {},
}));
jest.mock("../src/services/notifications.service", () => ({
  createNotification: jest.fn(),
}));

const sequelize = require("../src/config/db");
const logger = require("../src/helpers/logger");
const { Event, EventRegistration, Member, User } = require("../src/models");
const notifications = require("../src/services/notifications.service");
const memberPortalService = require("../src/services/member-portal.service");

describe("member event-registration notifications", () => {
  const transactionContext = { LOCK: { UPDATE: "UPDATE" } };
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
    EventRegistration.count.mockResolvedValue(0);
    EventRegistration.create.mockResolvedValue(registration);
    Member.findByPk.mockResolvedValue({ id: 42, status: "Active" });
    User.findOne.mockResolvedValue({ id: 9 });
    notifications.createNotification.mockResolvedValue({ id: 55 });
    Event.findAll.mockResolvedValue([]);
    EventRegistration.findAll.mockResolvedValue([]);
  });

  test("returns the event image URL to the member portal without exposing its storage key", async () => {
    const eventRow = {
      id: 18,
      title: "Community Gathering",
      description: "A church-wide event",
      start_date: "2026-11-01",
      end_date: null,
      location: "Main Hall",
      capacity: 100,
      total_parking_slots: 0,
      registration_deadline: null,
      status: "Upcoming",
      image_url: "/events/18/image",
      image_key: "events/private-storage-key.jpg",
      toJSON: () => ({
        id: 18,
        title: "Community Gathering",
        description: "A church-wide event",
        start_date: "2026-11-01",
        end_date: null,
        location: "Main Hall",
        capacity: 100,
        total_parking_slots: 0,
        registration_deadline: null,
        status: "Upcoming",
        image_url: "/events/18/image",
        image_key: "events/private-storage-key.jpg",
        category: null,
        EventRegistrations: [],
      }),
    };
    Event.findAll.mockResolvedValue([eventRow]);

    const [eventResult] = await memberPortalService.getMyEvents(42);

    expect(eventResult.image_url).toBe("/events/18/image");
    expect(eventResult.image_key).toBeUndefined();
  });

  test("notifies the member after their event registration commits", async () => {
    let transactionCommitted = false;
    sequelize.transaction.mockImplementation(async (callback) => {
      const result = await callback(transactionContext);
      transactionCommitted = true;
      return result;
    });
    notifications.createNotification.mockImplementation(async (payload) => {
      expect(transactionCommitted).toBe(true);
      return { id: 55, ...payload };
    });

    await expect(memberPortalService.registerForEvent(42, 12)).resolves.toBe(registration);

    expect(User.findOne).toHaveBeenCalledWith({
      where: { member_id: 42, is_active: 1, is_deleted: 0 },
      attributes: ["id"],
    });
    expect(notifications.createNotification).toHaveBeenCalledWith({
      user_id: 9,
      type: "event_registered",
      message: 'You have been successfully registered for "QA Community Gathering".',
      reference_id: 12,
      reference_type: "event",
    });
  });

  test("notifies the member after cancelling an event registration and retains its history", async () => {
    const update = jest.fn().mockResolvedValue(1);
    EventRegistration.findOne.mockResolvedValue({ ...registration, update });

    await expect(memberPortalService.cancelEventRegistration(42, 12)).resolves.toEqual({
      message: "Registration cancelled. Its history was retained.",
    });

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ is_deleted: 1, seat_number: null, parking_slot: null }));
    expect(notifications.createNotification).toHaveBeenCalledWith({
      user_id: 9,
      type: "event_unregistered",
      message: 'Your registration for "QA Community Gathering" has been cancelled.',
      reference_id: 12,
      reference_type: "event",
    });
  });

  test("keeps a successful registration when the notification service fails", async () => {
    notifications.createNotification.mockRejectedValue(new Error("notification store unavailable"));

    await expect(memberPortalService.registerForEvent(42, 12)).resolves.toBe(registration);

    expect(logger.error).toHaveBeenCalledWith(
      expect.any(Error),
      "Member event-registration notification failed",
    );
  });
});
