"use strict";

const mockState = {
  transaction: null,
  event: null,
  member: null,
  existing: null,
  seatConflict: null,
  parkingConflict: null,
  count: 0,
  maxSeat: 0,
  maxParking: 0,
};

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(),
}));
jest.mock("../src/models", () => ({
  Event: { findOne: jest.fn() },
  EventRegistration: {
    findOne: jest.fn(),
    unscoped: jest.fn(function unscoped() { return this; }),
    count: jest.fn(),
    max: jest.fn(),
    create: jest.fn(),
  },
  Member: { findByPk: jest.fn() },
}));

const sequelize = require("../src/config/db");
const { Event, EventRegistration, Member } = require("../src/models");
const {
  assertEventReservationLimits,
  registerEventMember,
  updateEventRegistrationReservation,
} = require("../src/helpers/eventRegistrationReservation.helper");

const transaction = { LOCK: { UPDATE: "UPDATE" } };
const baseEvent = {
  id: 11,
  status: "Upcoming",
  capacity: 4,
  total_parking_slots: 2,
  registration_deadline: null,
  title: "QA Gathering",
};

describe("event seat and parking reservations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.transaction = transaction;
    mockState.event = { ...baseEvent };
    mockState.member = { id: 42, status: "Active" };
    mockState.existing = null;
    mockState.seatConflict = null;
    mockState.parkingConflict = null;
    mockState.count = 0;
    mockState.maxSeat = 0;
    mockState.maxParking = 0;

    sequelize.transaction.mockImplementation(async (callback) => callback(transaction));
    Event.findOne.mockImplementation(async () => mockState.event);
    Member.findByPk.mockImplementation(async (id) => (Number(id) === 42 ? mockState.member : null));
    EventRegistration.findOne.mockImplementation(async ({ where }) => {
      if (where.seat_number !== undefined) return mockState.seatConflict;
      if (where.parking_slot !== undefined) return mockState.parkingConflict;
      return mockState.existing;
    });
    EventRegistration.count.mockImplementation(async () => mockState.count);
    EventRegistration.max.mockImplementation(async (field) => (field === "seat_number" ? mockState.maxSeat : mockState.maxParking));
    EventRegistration.create.mockImplementation(async (values) => ({ id: 501, ...values }));
  });

  test("creates a registration with a unique seat and parking assignment", async () => {
    const result = await registerEventMember({
      eventId: 11,
      memberId: 42,
      registeredBy: 9,
      seatNumber: 3,
      parkingSlot: 2,
    });

    expect(result).toMatchObject({ created: true, eventTitle: "QA Gathering" });
    expect(result.registration).toMatchObject({
      event_id: 11,
      member_id: 42,
      registered_by: 9,
      seat_number: 3,
      parking_slot: 2,
    });
    expect(Event.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 11, is_deleted: 0 },
      lock: "UPDATE",
      transaction,
    }));
  });

  test("rejects a seat outside configured Event capacity", async () => {
    await expect(registerEventMember({ eventId: 11, memberId: 42, seatNumber: 5 }))
      .rejects.toMatchObject({ code: "VALIDATION", status: 400 });
    expect(EventRegistration.create).not.toHaveBeenCalled();
  });

  test("rejects a parking slot outside the configured range", async () => {
    await expect(registerEventMember({ eventId: 11, memberId: 42, parkingSlot: 3 }))
      .rejects.toMatchObject({ code: "VALIDATION", status: 400 });
    expect(EventRegistration.create).not.toHaveBeenCalled();
  });

  test("rejects a duplicate Event seat", async () => {
    mockState.seatConflict = { id: 510 };
    await expect(registerEventMember({ eventId: 11, memberId: 42, seatNumber: 2 }))
      .rejects.toMatchObject({ code: "EVENT_SEAT_ALREADY_RESERVED", status: 409 });
    expect(EventRegistration.create).not.toHaveBeenCalled();
  });

  test("rejects a duplicate Event parking slot", async () => {
    mockState.parkingConflict = { id: 511 };
    await expect(registerEventMember({ eventId: 11, memberId: 42, parkingSlot: 1 }))
      .rejects.toMatchObject({ code: "EVENT_PARKING_ALREADY_RESERVED", status: 409 });
    expect(EventRegistration.create).not.toHaveBeenCalled();
  });

  test("rejects an RSVP that exceeds Event capacity", async () => {
    mockState.count = 4;
    await expect(registerEventMember({ eventId: 11, memberId: 42 }))
      .rejects.toMatchObject({ code: "VALIDATION", status: 400 });
    expect(EventRegistration.create).not.toHaveBeenCalled();
  });

  test("updates a current registration without creating another row", async () => {
    const existing = {
      id: 51,
      event_id: 11,
      member_id: 42,
      seat_number: 1,
      parking_slot: 1,
      update: jest.fn(async (values) => Object.assign(existing, values)),
    };
    mockState.existing = existing;

    const result = await updateEventRegistrationReservation({
      eventId: 11,
      memberId: 42,
      seatNumber: 3,
      parkingSlot: 2,
    });

    expect(existing.update).toHaveBeenCalledWith({ seat_number: 3, parking_slot: 2 }, { transaction });
    expect(result).toMatchObject({ created: false, registration: { id: 51, seat_number: 3, parking_slot: 2 } });
    expect(EventRegistration.create).not.toHaveBeenCalled();
  });

  test("allows authorized staff to update reservations after the registration deadline while the Event is open", async () => {
    const existing = {
      id: 51,
      event_id: 11,
      member_id: 42,
      seat_number: null,
      parking_slot: null,
      update: jest.fn(async (values) => Object.assign(existing, values)),
    };
    mockState.existing = existing;
    mockState.event.registration_deadline = new Date(Date.now() - 60_000);

    await expect(updateEventRegistrationReservation({
      eventId: 11,
      memberId: 42,
      seatNumber: 1,
      allowAfterDeadline: true,
    })).resolves.toMatchObject({ registration: { id: 51, seat_number: 1 } });
  });

  test("blocks member reservation changes after the registration deadline", async () => {
    mockState.event.registration_deadline = new Date(Date.now() - 60_000);
    await expect(registerEventMember({ eventId: 11, memberId: 42 }))
      .rejects.toMatchObject({ code: "VALIDATION", status: 400 });
    expect(EventRegistration.create).not.toHaveBeenCalled();
  });
});

describe("event reservation capacity changes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.count = 0;
    mockState.maxSeat = 0;
    mockState.maxParking = 0;
    EventRegistration.count.mockImplementation(async () => mockState.count);
    EventRegistration.max.mockImplementation(async (field) => (field === "seat_number" ? mockState.maxSeat : mockState.maxParking));
  });

  test("prevents reducing capacity below registered people", async () => {
    mockState.count = 2;
    await expect(assertEventReservationLimits({ event: baseEvent, capacity: 1, transaction }))
      .rejects.toMatchObject({ code: "EVENT_CAPACITY_BELOW_CURRENT_REGISTRATIONS", status: 409 });
  });

  test("prevents reducing capacity below an assigned seat", async () => {
    mockState.maxSeat = 3;
    await expect(assertEventReservationLimits({ event: baseEvent, capacity: 2, transaction }))
      .rejects.toMatchObject({ code: "EVENT_CAPACITY_BELOW_RESERVED_SEAT", status: 409 });
  });

  test("prevents reducing parking below the highest assigned slot", async () => {
    mockState.maxParking = 2;
    await expect(assertEventReservationLimits({ event: baseEvent, totalParkingSlots: 1, transaction }))
      .rejects.toMatchObject({ code: "EVENT_PARKING_LIMIT_BELOW_RESERVED_SLOT", status: 409 });
  });

  test("prevents removing seat capacity while seats remain reserved", async () => {
    mockState.maxSeat = 1;
    await expect(assertEventReservationLimits({ event: baseEvent, capacity: null, transaction }))
      .rejects.toMatchObject({ code: "EVENT_CAPACITY_REQUIRED_FOR_RESERVED_SEATS", status: 409 });
  });
});
