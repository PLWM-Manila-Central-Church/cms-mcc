"use strict";

const { INVENTORY_STATUSES, deriveInventoryStatus } = require("../src/helpers/inventoryStatus.helper");

describe("inventory availability state", () => {
  test("exposes the four states documented for inventory", () => {
    expect(INVENTORY_STATUSES).toEqual(["Available", "Low Stock", "Out of Stock", "Under Repair"]);
  });

  test("keeps repair state until a manager marks the item available", () => {
    expect(deriveInventoryStatus({ quantity: 12, low_stock_threshold: 5, status: "Under Repair" })).toBe("Under Repair");
    expect(deriveInventoryStatus({ quantity: 12, low_stock_threshold: 5, status: "Available" })).toBe("Available");
  });

  test("derives out-of-stock before low-stock when quantity is zero", () => {
    expect(deriveInventoryStatus({ quantity: 0, low_stock_threshold: 5, status: "Available" })).toBe("Out of Stock");
  });

  test("derives low-stock from the optional threshold, including a zero threshold", () => {
    expect(deriveInventoryStatus({ quantity: 3, low_stock_threshold: 5, status: "Available" })).toBe("Low Stock");
    expect(deriveInventoryStatus({ quantity: 1, low_stock_threshold: 0, status: "Available" })).toBe("Available");
    expect(deriveInventoryStatus({ quantity: 3, low_stock_threshold: null, status: "Available" })).toBe("Available");
  });
});
