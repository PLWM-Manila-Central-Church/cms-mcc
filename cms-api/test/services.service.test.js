"use strict";

const mockState = {};

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => callback(mockState.transaction)),
}));
jest.mock("../src/models", () => ({
  Service: { findByPk: jest.fn(async () => mockState.service) },
  ServiceAttendanceSummary: {},
  ServiceResponse: { findAll: jest.fn(async () => mockState.reservations) },
  Attendance: {},
  User: { findAll: jest.fn(async () => []) },
}));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn() }));
jest.mock("../src/services/notifications.service", () => ({ bulkCreateNotifications: jest.fn(async () => []) }));
jest.mock("../src/helpers/attendanceSummary.helper", () => ({ syncServiceAttendanceSummary: jest.fn(async () => {}) }));
jest.mock("../src/helpers/scopedLeader.helper", () => ({ isScopedLeader: jest.fn(() => false) }));

const { Service, ServiceResponse } = require("../src/models");
const auditLog = require("../src/helpers/auditLog.helper");
const service = require("../src/services/services.service");

describe("service details, lifecycle, and capacity updates", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.transaction = { LOCK: { UPDATE: "UPDATE" } };
    mockState.reservations = [];
    mockState.service = {
      id: 12,
      title: "Sunday Service",
      status: "draft",
      capacity: 20,
      total_parking_slots: 4,
      update: jest.fn(async (values) => Object.assign(mockState.service, values)),
      destroy: jest.fn(async () => true),
    };
  });

  test("returns an existing service detail", async () => {
    await expect(service.getServiceById(12)).resolves.toBe(mockState.service);
  });

  test("returns not found only when the service is absent", async () => {
    mockState.service = null;
    await expect(service.getServiceById(12)).rejects.toMatchObject({ code: "RECORD_NOT_FOUND", status: 404 });
  });

  test("updates an existing service and audits it", async () => {
    const result = await service.updateService(12, { title: "Sunday Worship" }, 8);
    expect(result.title).toBe("Sunday Worship");
    expect(mockState.service.update).toHaveBeenCalledWith({ title: "Sunday Worship" }, { transaction: mockState.transaction });
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "UPDATE_SERVICE", targetId: 12 }));
  });

  test("prevents reducing capacity below existing RSVPs or reserved slots", async () => {
    mockState.reservations = [{ seat_number: "3", parking_slot: "2" }, { seat_number: "4", parking_slot: null }, { seat_number: null, parking_slot: null }];
    await expect(service.updateService(12, { capacity: 2 }, 8))
      .rejects.toMatchObject({ code: "CAPACITY_BELOW_CURRENT_RSVPS", status: 409 });
    expect(mockState.service.update).not.toHaveBeenCalled();

    mockState.reservations = [{ seat_number: "4", parking_slot: "4" }];
    await expect(service.updateService(12, { total_parking_slots: 2 }, 8))
      .rejects.toMatchObject({ code: "PARKING_LIMIT_BELOW_RESERVED_SLOT", status: 409 });
  });

  test("applies the allowed status flow and rejects invalid transitions", async () => {
    const result = await service.updateStatus(12, "published", 8);
    expect(result.status).toBe("published");
    mockState.service.status = "published";
    await expect(service.updateStatus(12, "draft", 8))
      .rejects.toMatchObject({ code: "INVALID_STATUS_TRANSITION", status: 400 });
  });

  test("deletes an existing service and returns not found for a missing one", async () => {
    await expect(service.deleteService(12, 8)).resolves.toMatchObject({ message: "Service deleted successfully." });
    expect(mockState.service.destroy).toHaveBeenCalled();
    mockState.service = null;
    await expect(service.deleteService(12, 8)).rejects.toMatchObject({ code: "RECORD_NOT_FOUND", status: 404 });
  });
});
