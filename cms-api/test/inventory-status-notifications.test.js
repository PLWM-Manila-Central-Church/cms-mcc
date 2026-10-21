"use strict";

const mockState = { item: null, managers: [], members: [], roles: [], pendingRequests: [] };

jest.mock("../src/config/db", () => ({}));
jest.mock("../src/helpers/cache.helper", () => ({}));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn() }));
jest.mock("../src/services/notifications.service", () => ({ bulkCreateNotifications: jest.fn(async () => []) }));
jest.mock("../src/models", () => ({
  InventoryItem: {
    findByPk: jest.fn(async () => mockState.item),
    findOne: jest.fn(async () => mockState.item),
  },
  InventoryCategory: { findByPk: jest.fn() },
  InventoryRequest: { findAll: jest.fn(async () => mockState.pendingRequests) },
  InventoryUsage: {},
  User: { findAll: jest.fn() },
  Role: { findAll: jest.fn() },
  Event: {},
  Service: {},
  MinistryRole: {},
}));

const { Op } = require("sequelize");
const { InventoryItem, InventoryRequest, Role, User } = require("../src/models");
const notifications = require("../src/services/notifications.service");
const inventoryService = require("../src/services/inventory.service");

describe("inventory status-change notifications", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.item = {
      id: 17,
      name: "Status Change QA Item",
      quantity: 5,
      unit: "boxes",
      status: "Available",
      low_stock_threshold: 1,
      update: jest.fn(async (values) => Object.assign(mockState.item, values)),
    };
    mockState.managers = [{ id: 1 }, { id: 2 }];
    mockState.members = [{ id: 6 }, { id: 7 }, { id: 8 }];
    mockState.roles = [
      { id: 1, role_name: "System Admin" },
      { id: 2, role_name: "Inventory Manager" },
      { id: 3, role_name: "Member" },
    ];
    mockState.pendingRequests = [
      { requested_by: 4 },
      { requested_by: 4 },
      { requested_by: 5 },
    ];
    Role.findAll.mockImplementation(async ({ where }) =>
      mockState.roles.filter((role) => where.role_name[Op.in].includes(role.role_name)));
    User.findAll.mockImplementation(async ({ where }) =>
      where.role_id[Op.in].includes(3) ? mockState.members : mockState.managers);
  });

  test("notifies managers and affected requesters, excluding unrelated Members", async () => {
    await inventoryService.updateItem(17, { status: "Under Repair" }, 99);

    expect(notifications.bulkCreateNotifications).toHaveBeenCalledTimes(2);
    expect(InventoryItem.findOne).toHaveBeenCalledTimes(2);
    expect(Role.findAll).toHaveBeenCalledTimes(1);
    expect(User.findAll).toHaveBeenCalledTimes(1);
    expect(InventoryRequest.findAll).toHaveBeenCalledWith({
      where: { item_id: 17, status: "pending" },
      attributes: ["requested_by"],
    });
    expect(notifications.bulkCreateNotifications).toHaveBeenNthCalledWith(
      1,
      [1, 2],
      expect.objectContaining({
        type: "inventory_item_under_repair",
        reference_type: "inventory_item",
        reference_id: 17,
      }),
    );
    expect(notifications.bulkCreateNotifications).toHaveBeenNthCalledWith(
      2,
      [4, 5],
      expect.objectContaining({
        type: "inventory_request_item_under_repair",
        reference_type: "inventory_item",
        reference_id: 17,
      }),
    );
  });
});
