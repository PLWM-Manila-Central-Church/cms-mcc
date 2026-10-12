"use strict";

const state = { event: null, registrationCount: 0, maxSeat: 0, maxParking: 0 };

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(),
  fn: jest.fn(),
  col: jest.fn(),
}));
jest.mock("../src/models", () => ({
  Event: { findOne: jest.fn() },
  EventCategory: { findByPk: jest.fn() },
  EventRegistration: { count: jest.fn(), max: jest.fn() },
  EventAttendance: {},
  Member: {},
  User: {},
  CellGroup: {},
  Group: {},
}));
jest.mock("../src/helpers/scopedLeader.helper", () => ({
  getMemberScopeWhere: jest.fn().mockResolvedValue(null),
}));
jest.mock("../src/helpers/cache.helper", () => ({ keys: jest.fn(() => []), del: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn() }));
jest.mock("../src/services/notifications.service", () => ({ createNotification: jest.fn() }));

const sequelize = require("../src/config/db");
const { Event, EventRegistration } = require("../src/models");
const eventsService = require("../src/services/events.service");

describe("Event reservation capacity edits", () => {
  const transaction = { LOCK: { UPDATE: "UPDATE" } };

  beforeEach(() => {
    jest.clearAllMocks();
    state.registrationCount = 3;
    state.maxSeat = 3;
    state.maxParking = 2;
    state.event = {
      id: 12,
      status: "Upcoming",
      capacity: 25,
      total_parking_slots: 4,
      update: jest.fn(),
    };
    sequelize.transaction.mockImplementation(async (callback) => callback(transaction));
    Event.findOne.mockResolvedValue(state.event);
    EventRegistration.count.mockImplementation(async () => state.registrationCount);
    EventRegistration.max.mockImplementation(async (field) => (field === "seat_number" ? state.maxSeat : state.maxParking));
  });

  it("prevents a capacity edit below current registrations", async () => {
    await expect(eventsService.updateEvent(12, { capacity: 2 }, 9))
      .rejects.toMatchObject({ code: "EVENT_CAPACITY_BELOW_CURRENT_REGISTRATIONS", status: 409 });
    expect(state.event.update).not.toHaveBeenCalled();
  });

  it("prevents a capacity edit below an assigned seat even when registrations fit", async () => {
    state.registrationCount = 2;
    state.maxSeat = 4;
    await expect(eventsService.updateEvent(12, { capacity: 3 }, 9))
      .rejects.toMatchObject({ code: "EVENT_CAPACITY_BELOW_RESERVED_SEAT", status: 409 });
    expect(state.event.update).not.toHaveBeenCalled();
  });

  it("prevents reducing parking slots below a reserved slot", async () => {
    state.maxParking = 3;
    await expect(eventsService.updateEvent(12, { total_parking_slots: 2 }, 9))
      .rejects.toMatchObject({ code: "EVENT_PARKING_LIMIT_BELOW_RESERVED_SLOT", status: 409 });
    expect(state.event.update).not.toHaveBeenCalled();
  });
});
