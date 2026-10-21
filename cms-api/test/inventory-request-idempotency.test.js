"use strict";

const mockState = {};

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => callback(mockState.transaction)),
}));
jest.mock("../src/helpers/cache.helper", () => ({ keys: jest.fn(() => []), del: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn() }));
jest.mock("../src/services/notifications.service", () => ({ bulkCreateNotifications: jest.fn(async () => []) }));
jest.mock("../src/models", () => ({
  InventoryItem: {
    findByPk: jest.fn(async () => mockState.item),
    findOne: jest.fn(async () => mockState.item),
  },
  InventoryCategory: {},
  InventoryRequest: {
    findOne: jest.fn(async ({ where }) => {
      if (!where.request_key) return null;
      return [...mockState.requests.values()].find((row) => (
        Number(row.requested_by) === Number(where.requested_by)
        && row.request_key === where.request_key
      )) || null;
    }),
    create: jest.fn(async (values) => {
      const duplicate = values.request_key && [...mockState.requests.values()].some((row) => (
        Number(row.requested_by) === Number(values.requested_by)
        && row.request_key === values.request_key
      ));
      if (duplicate) {
        const error = new Error("duplicate request key");
        error.name = "SequelizeUniqueConstraintError";
        throw error;
      }
      const row = { id: mockState.nextId++, ...values };
      mockState.requests.set(row.id, row);
      return row;
    }),
  },
  InventoryUsage: {},
  User: { findAll: jest.fn(async () => [{ id: 900 }]) },
  Role: { findAll: jest.fn(async () => [{ id: 1 }]) },
  Event: { findByPk: jest.fn(async (id) => Number(id) === Number(mockState.event?.id) ? mockState.event : null) },
  Service: {
    findByPk: jest.fn(async (id) => Number(id) === Number(mockState.service?.id) ? mockState.service : null),
    findOne: jest.fn(async ({ where }) => Number(where.id) === Number(mockState.service?.id) ? mockState.service : null),
  },
  MinistryRole: {
    findByPk: jest.fn(async (id) => Number(id) === Number(mockState.ministryRole?.id) ? mockState.ministryRole : null),
    findOne: jest.fn(async ({ where }) => Number(where.id) === Number(mockState.ministryRole?.id) ? mockState.ministryRole : null),
  },
}));

const { InventoryItem, InventoryRequest } = require("../src/models");
const cache = require("../src/helpers/cache.helper");
const auditLog = require("../src/helpers/auditLog.helper");
const notifications = require("../src/services/notifications.service");
const inventoryService = require("../src/services/inventory.service");

const makePayload = (requestKey, overrides = {}) => ({
  item_id: 12,
  quantity: 2,
  purpose: "Sanctuary setup",
  service_id: 44,
  request_key: requestKey,
  ...overrides,
});

describe("Inventory request idempotency", () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    mockState.transaction = { LOCK: { UPDATE: "UPDATE" } };
    mockState.nextId = 301;
    mockState.requests = new Map();
    mockState.item = { id: 12, name: "Folding Chair", quantity: 5, status: "Available" };
    mockState.event = null;
    mockState.service = { id: 44, status: "published" };
    mockState.ministryRole = null;
    jest.spyOn(inventoryService, "getRequestById").mockImplementation(async (id) => mockState.requests.get(Number(id)) || null);
  });

  test("stores the request key and records one audit/notification for a new request", async () => {
    const result = await inventoryService.createRequest(makePayload("inv-test-key-0001"), 7);

    expect(result).toMatchObject({ id: 301, status: "pending", request_key: "inv-test-key-0001" });
    expect(InventoryItem.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 12, is_deleted: 0 },
      lock: "UPDATE",
    }));
    expect(InventoryRequest.create).toHaveBeenCalledTimes(1);
    expect(auditLog.log).toHaveBeenCalledTimes(1);
    expect(notifications.bulkCreateNotifications).toHaveBeenCalledTimes(1);
    expect(cache.keys).toHaveBeenCalledWith("dashboard:*");
  });

  test("returns the existing request on an identical retry without duplicate side effects", async () => {
    const payload = makePayload("inv-test-key-0002");
    const first = await inventoryService.createRequest(payload, 7);
    const retry = await inventoryService.createRequest(payload, 7);

    expect(retry.id).toBe(first.id);
    expect(InventoryRequest.create).toHaveBeenCalledTimes(1);
    expect(auditLog.log).toHaveBeenCalledTimes(1);
    expect(notifications.bulkCreateNotifications).toHaveBeenCalledTimes(1);
  });

  test("accepts requests linked to an ongoing Event or an existing Ministry", async () => {
    mockState.event = { id: 51, status: "Ongoing" };
    const eventRequest = await inventoryService.createRequest(makePayload("inv-event-active-01", {
      service_id: undefined,
      event_id: 51,
    }), 7);

    mockState.ministryRole = { id: 61, name: "Worship" };
    const ministryRequest = await inventoryService.createRequest(makePayload("inv-ministry-active-1", {
      service_id: undefined,
      ministry_role_id: 61,
    }), 7);

    expect(eventRequest.event_id).toBe(51);
    expect(ministryRequest.ministry_role_id).toBe(61);
    expect(InventoryRequest.create).toHaveBeenCalledTimes(2);
  });

  test.each([
    ["completed Event", "event", { event_id: 51 }, { id: 51, status: "Completed" }],
    ["cancelled Event", "event", { event_id: 52 }, { id: 52, status: "Cancelled" }],
    ["draft Service", "service", { service_id: 45 }, { id: 45, status: "draft" }],
    ["cancelled Service", "service", { service_id: 46 }, { id: 46, status: "cancelled" }],
    ["completed Service", "service", { service_id: 47 }, { id: 47, status: "completed" }],
  ])("rejects a request linked to a %s", async (_label, recordType, context, record) => {
    mockState[recordType] = record;

    await expect(inventoryService.createRequest(makePayload("inv-inactive-context-1", {
      service_id: recordType === "event" ? undefined : context.service_id,
      event_id: recordType === "event" ? context.event_id : undefined,
    }), 7)).rejects.toMatchObject({ code: "INVALID_REQUEST_CONTEXT", status: 400 });

    expect(InventoryRequest.create).not.toHaveBeenCalled();
    expect(auditLog.log).not.toHaveBeenCalled();
    expect(notifications.bulkCreateNotifications).not.toHaveBeenCalled();
  });

  test("rejects reusing a key for a different payload and allows distinct intentional requests", async () => {
    const payload = makePayload("inv-test-key-0003");
    await inventoryService.createRequest(payload, 7);

    await expect(inventoryService.createRequest({ ...payload, quantity: 3 }, 7))
      .rejects.toMatchObject({ code: "INVENTORY_REQUEST_KEY_REUSED", status: 409 });
    await inventoryService.createRequest(makePayload("inv-test-key-0004"), 7);

    expect(InventoryRequest.create).toHaveBeenCalledTimes(2);
    expect(mockState.requests.size).toBe(2);
    expect(notifications.bulkCreateNotifications).toHaveBeenCalledTimes(2);
  });

  test("resolves concurrent same-key creates to one request and one notification", async () => {
    const payload = makePayload("inv-test-key-concurrent");
    const [first, replay] = await Promise.all([
      inventoryService.createRequest(payload, 7),
      inventoryService.createRequest(payload, 7),
    ]);

    expect(first.id).toBe(replay.id);
    expect(InventoryRequest.create).toHaveBeenCalledTimes(2);
    expect(mockState.requests.size).toBe(1);
    expect(auditLog.log).toHaveBeenCalledTimes(1);
    expect(notifications.bulkCreateNotifications).toHaveBeenCalledTimes(1);
  });
});
