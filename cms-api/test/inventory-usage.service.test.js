"use strict";

const mockState = {};

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => callback(mockState.transaction)),
}));
jest.mock("../src/helpers/cache.helper", () => ({}));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn() }));
jest.mock("../src/services/notifications.service", () => ({ bulkCreateNotifications: jest.fn(async () => []) }));
jest.mock("../src/models", () => ({
  InventoryItem: {
    findOne: jest.fn(async () => mockState.item),
    findByPk: jest.fn(async () => mockState.item),
  },
  InventoryCategory: {},
  InventoryRequest: { findAll: jest.fn(async () => []) },
  InventoryUsage: {
    create: jest.fn(async (values) => ({ id: 77, ...values })),
    findByPk: jest.fn(async () => mockState.usage),
  },
  User: { findAll: jest.fn(async () => []) },
  Role: { findAll: jest.fn(async () => []) },
  Event: {},
  Service: {},
  MinistryRole: {},
}));

const { InventoryItem, InventoryUsage } = require("../src/models");
const auditLog = require("../src/helpers/auditLog.helper");
const inventoryService = require("../src/services/inventory.service");

describe("inventory usage stock movement", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.transaction = { LOCK: { UPDATE: "UPDATE" } };
    mockState.item = {
      id: 10,
      name: "Folding Chair",
      unit: "pcs",
      quantity: 5,
      status: "Available",
      low_stock_threshold: 3,
      decrement: jest.fn(async (field, { by }) => { mockState.item[field] -= by; }),
      update: jest.fn(async (values) => Object.assign(mockState.item, values)),
    };
    mockState.usage = {
      id: 77,
      item_id: 10,
      quantity_used: 2,
      is_reversed: 0,
      update: jest.fn(async (values) => Object.assign(mockState.usage, values)),
    };
  });

  test("records usage atomically, reduces stock, and derives the low-stock state", async () => {
    const result = await inventoryService.createUsage({ item_id: 10, quantity_used: 2, used_for: "Service setup" }, 4);

    expect(result).toMatchObject({ item_id: 10, quantity_used: 2, used_for: "Service setup" });
    expect(mockState.item.quantity).toBe(3);
    expect(mockState.item.status).toBe("Low Stock");
    expect(InventoryItem.findOne).toHaveBeenCalledWith(expect.objectContaining({ transaction: mockState.transaction }));
  });

  test("rejects a usage movement that would reduce stock below zero", async () => {
    await expect(inventoryService.createUsage({ item_id: 10, quantity_used: 6 }, 4))
      .rejects.toMatchObject({ code: "VALIDATION", status: 400 });
    expect(InventoryUsage.create).not.toHaveBeenCalled();
    expect(mockState.item.quantity).toBe(5);
  });

  test("reverses usage by restoring stock and retaining an auditable usage row", async () => {
    mockState.item.quantity = 3;
    mockState.item.status = "Low Stock";

    await inventoryService.reverseUsage(77, 4);

    expect(mockState.item.update).toHaveBeenCalledWith({ quantity: 5, status: "Available" }, expect.objectContaining({ transaction: mockState.transaction }));
    expect(mockState.usage.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_reversed: 1, reversed_by: 4 }),
      { transaction: mockState.transaction },
    );
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({ action: "REVERSE_INVENTORY_USAGE", targetId: 77 }), expect.objectContaining({ transaction: mockState.transaction }));
  });
});
