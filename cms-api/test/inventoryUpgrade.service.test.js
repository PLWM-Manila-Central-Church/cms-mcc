"use strict";

const mockTx = { LOCK: { UPDATE: "UPDATE" } };
jest.mock("../src/config/db", () => ({ transaction: jest.fn((cb) => cb(mockTx)) }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/models", () => ({
  InventoryItem: { findOne: jest.fn(), findAll: jest.fn(), findByPk: jest.fn(), update: jest.fn() },
  InventoryTransaction: { create: jest.fn(), findAll: jest.fn() },
  InventoryBorrowing: { create: jest.fn(), findOne: jest.fn(), findAll: jest.fn() },
  InventoryMaintenance: { create: jest.fn(), findOne: jest.fn(), findAll: jest.fn() },
  Expense: { create: jest.fn() },
  ExpenseCategory: { findOne: jest.fn().mockResolvedValue({ id: 2 }) },
  PaymentMethod: { findOne: jest.fn().mockResolvedValue({ id: 1 }) },
}));

const models = require("../src/models");
const invUpgrade = require("../src/services/inventoryUpgrade.service");

describe("Phase 7 — Inventory Authoritative Stock Ledger, Borrowing & Maintenance", () => {
  beforeEach(() => jest.clearAllMocks());

  test("rejects stock movement that would cause negative inventory", async () => {
    models.InventoryItem.findOne.mockResolvedValue({ id: 1, name: "Mic", quantity: 2, low_stock_threshold: 1 });
    await expect(
      invUpgrade.recordStockMovement({ item_id: 1, quantity_delta: -5 }, { userId: 1 })
    ).rejects.toMatchObject({ status: 400, code: "INSUFFICIENT_STOCK" });
    expect(models.InventoryTransaction.create).not.toHaveBeenCalled();
  });

  test("logs authoritative stock-in and optionally submits Finance purchase expense approval", async () => {
    const update = jest.fn();
    models.InventoryItem.findOne.mockResolvedValue({ id: 1, name: "Printer Paper", quantity: 3, low_stock_threshold: 2, status: "Available", update });
    models.Expense.create.mockResolvedValue({ id: 88 });
    models.InventoryTransaction.create.mockResolvedValue({ id: 44, balance_after: 13 });

    const res = await invUpgrade.recordStockMovement({
      item_id: 1,
      quantity_delta: 10,
      unit_cost: 250,
      supplier: "Office Warehouse",
      create_finance_purchase_request: true,
    }, { userId: 1 });

    expect(models.Expense.create).toHaveBeenCalledWith(expect.objectContaining({ amount: 2500, status: "pending_approval" }), expect.any(Object));
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ quantity: 13, status: "Available" }), expect.any(Object));
    expect(res.finance_expense_id).toBe(88);
  });

  test("reconciles damaged return by setting item status to Under Repair and writing ledger return entry", async () => {
    const borrowUpdate = jest.fn();
    const itemUpdate = jest.fn();
    models.InventoryBorrowing.findOne.mockResolvedValue({ id: 5, item_id: 2, borrower_name: "Ana", quantity: 1, quantity_returned: 0, update: borrowUpdate });
    models.InventoryItem.findOne.mockResolvedValue({ id: 2, name: "Wireless Mic", quantity: 3, low_stock_threshold: 1, status: "Available", update: itemUpdate });
    models.InventoryTransaction.create.mockResolvedValue({ id: 90 });

    await invUpgrade.returnBorrowing(5, { quantity_returned: 1, return_condition: "Damaged" }, { userId: 1 });
    expect(itemUpdate).toHaveBeenCalledWith(expect.objectContaining({ quantity: 4, status: "Under Repair" }), expect.any(Object));
    expect(borrowUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "damaged", quantity_returned: 1 }), expect.any(Object));
  });
});
