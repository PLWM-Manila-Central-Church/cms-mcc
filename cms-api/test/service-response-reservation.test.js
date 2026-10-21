"use strict";

const mockState = {};

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => callback(mockState.transaction)),
}));
jest.mock("../src/models", () => ({
  Service: {
    findByPk: jest.fn(async () => mockState.service),
    findOne: jest.fn(async () => mockState.service),
  },
  ServiceResponse: {
    findOne: jest.fn(async ({ where }) => {
      if (where.member_id === mockState.memberId) return mockState.existingResponse;
      if (where.seat_number) return mockState.seatConflict;
      if (where.parking_slot) return mockState.parkingConflict;
      return null;
    }),
    count: jest.fn(async () => mockState.attendingCount),
    create: jest.fn(async (values) => ({ id: 33, ...values })),
  },
  Member: { findByPk: jest.fn(async () => ({ id: mockState.memberId })) },
  Attendance: {
    findOne: jest.fn(async () => mockState.existingAttendance),
    create: jest.fn(async (values) => values),
    destroy: jest.fn(async () => 1),
  },
}));

const { Service, ServiceResponse, Attendance } = require("../src/models");
const { saveServiceResponse } = require("../src/helpers/serviceResponseReservation.helper");

describe("service response reservations", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.transaction = { LOCK: { UPDATE: "UPDATE" } };
    mockState.service = { id: 11, capacity: 4, total_parking_slots: 2 };
    mockState.memberId = 22;
    mockState.existingResponse = null;
    mockState.existingAttendance = null;
    mockState.attendingCount = 1;
    mockState.seatConflict = null;
    mockState.parkingConflict = null;
  });

  test("saves an attending RSVP with bounded seat and parking reservations", async () => {
    const result = await saveServiceResponse({
      serviceId: 11,
      memberId: 22,
      attendanceStatus: "ATTENDING",
      seatNumber: "3",
      parkingSlot: 1,
    });

    expect(result).toMatchObject({ service_id: 11, member_id: 22, attendance_status: "ATTENDING", seat_number: "3", parking_slot: "1" });
    expect(ServiceResponse.create).toHaveBeenCalledWith(expect.objectContaining({ seat_number: "3", parking_slot: "1" }), expect.any(Object));
    expect(Attendance.create).toHaveBeenCalledWith(expect.objectContaining({ check_in_method: "pre-reg", service_id: 11, member_id: 22 }), expect.any(Object));
  });

  test("rejects an RSVP that exceeds service capacity", async () => {
    mockState.attendingCount = 4;
    await expect(saveServiceResponse({ serviceId: 11, memberId: 22, attendanceStatus: "ATTENDING" }))
      .rejects.toMatchObject({ code: "SERVICE_FULL", status: 409 });
    expect(ServiceResponse.create).not.toHaveBeenCalled();
  });

  test("rejects duplicate reserved seats", async () => {
    mockState.seatConflict = { id: 44 };
    await expect(saveServiceResponse({ serviceId: 11, memberId: 22, attendanceStatus: "ATTENDING", seatNumber: 3 }))
      .rejects.toMatchObject({ code: "SEAT_ALREADY_RESERVED", status: 409 });
    expect(ServiceResponse.create).not.toHaveBeenCalled();
  });

  test("rejects duplicate reserved parking slots", async () => {
    mockState.parkingConflict = { id: 45 };
    await expect(saveServiceResponse({ serviceId: 11, memberId: 22, attendanceStatus: "ATTENDING", parkingSlot: 1 }))
      .rejects.toMatchObject({ code: "PARKING_ALREADY_RESERVED", status: 409 });
    expect(ServiceResponse.create).not.toHaveBeenCalled();
  });

  test("rejects slots beyond the configured bounds", async () => {
    await expect(saveServiceResponse({ serviceId: 11, memberId: 22, attendanceStatus: "ATTENDING", seatNumber: 5 }))
      .rejects.toMatchObject({ code: "VALIDATION", status: 400 });
    await expect(saveServiceResponse({ serviceId: 11, memberId: 22, attendanceStatus: "ATTENDING", parkingSlot: 3 }))
      .rejects.toMatchObject({ code: "VALIDATION", status: 400 });
  });

  test.each(["NOT_ATTENDING", "UNDECIDED"])("releasing a %s RSVP clears reservations and removes only the pre-registration attendance row", async (attendanceStatus) => {
    mockState.existingResponse = {
      id: 55,
      attendance_status: "ATTENDING",
      seat_number: "2",
      parking_slot: "1",
      update: jest.fn(async (values) => Object.assign(mockState.existingResponse, values)),
    };

    await saveServiceResponse({ serviceId: 11, memberId: 22, attendanceStatus });

    expect(mockState.existingResponse.update).toHaveBeenCalledWith(expect.objectContaining({ seat_number: null, parking_slot: null }), expect.any(Object));
    expect(Attendance.destroy).toHaveBeenCalledWith(expect.objectContaining({
      where: { service_id: 11, member_id: 22, check_in_method: "pre-reg" },
      transaction: mockState.transaction,
    }));
  });

  test("allows a member to claim a released seat and parking slot again", async () => {
    mockState.existingResponse = {
      id: 55,
      attendance_status: "UNDECIDED",
      seat_number: null,
      parking_slot: null,
      update: jest.fn(async (values) => Object.assign(mockState.existingResponse, values)),
    };

    const result = await saveServiceResponse({
      serviceId: 11,
      memberId: 22,
      attendanceStatus: "ATTENDING",
      seatNumber: 2,
      parkingSlot: 1,
    });

    expect(result).toMatchObject({ attendance_status: "ATTENDING", seat_number: "2", parking_slot: "1" });
    expect(mockState.existingResponse.update).toHaveBeenCalledWith(expect.objectContaining({ seat_number: "2", parking_slot: "1" }), expect.any(Object));
  });
});
