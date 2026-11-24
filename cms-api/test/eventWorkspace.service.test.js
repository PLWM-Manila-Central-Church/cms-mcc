"use strict";

const mockTx = { commit: jest.fn(), rollback: jest.fn() };
jest.mock("../src/config/db", () => ({ transaction: jest.fn((cb) => cb(mockTx)) }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/models", () => ({
  Event: { findByPk: jest.fn(), count: jest.fn() },
  EventCommittee: { findAll: jest.fn(), create: jest.fn() },
  EventAssignment: { findAll: jest.fn(), create: jest.fn(), findOne: jest.fn() },
  EventProgramItem: { findAll: jest.fn(), create: jest.fn(), findOne: jest.fn() },
  EventBudget: { findAll: jest.fn(), create: jest.fn(), findOne: jest.fn(), count: jest.fn() },
  EventBudgetItem: { create: jest.fn() },
  EventCashAdvance: { findAll: jest.fn(), create: jest.fn(), findOne: jest.fn(), count: jest.fn() },
  EventLiquidation: { findAll: jest.fn(), create: jest.fn(), findOne: jest.fn(), count: jest.fn() },
  EventLiquidationItem: { create: jest.fn() },
  EventApproval: { create: jest.fn().mockResolvedValue({ id: 1 }) },
  EventRegistration: { count: jest.fn() },
  InventoryRequest: { findAll: jest.fn() },
  InventoryItem: {},
  Expense: { findAll: jest.fn(), create: jest.fn() },
  ExpenseCategory: { findOne: jest.fn().mockResolvedValue({ id: 2 }) },
  PaymentMethod: { findOne: jest.fn().mockResolvedValue({ id: 1 }) },
  Member: {},
  Fund: {},
  Account: {},
}));

const models = require("../src/models");
const eventWorkspace = require("../src/services/eventWorkspace.service");

describe("Phase 4 — Event Workspace & Hybrid Finance Posting", () => {
  beforeEach(() => jest.clearAllMocks());

  test("releasing a cash advance never creates a Finance Expense record", async () => {
    const update = jest.fn();
    models.EventCashAdvance.findOne.mockResolvedValue({ id: 5, status: "requested", amount_released: 10000, update });

    await eventWorkspace.releaseCashAdvance(1, 5, { reference_number: "CV-001" }, { userId: 2 });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "released", reference_number: "CV-001" }));
    expect(models.Expense.create).not.toHaveBeenCalled();
  });

  test("verifyAndPostLiquidation posts each receipt item once, marks advance liquidated, and prevents double-posting", async () => {
    const item1Update = jest.fn();
    const item2Update = jest.fn();
    const advUpdate = jest.fn();
    const liqUpdate = jest.fn();

    models.EventLiquidation.findOne.mockResolvedValue({
      id: 7,
      event_id: 1,
      cash_advance_id: 5,
      total_advanced: 10000,
      total_spent: 8200,
      amount_returned: 1800,
      amount_reimbursed: 0,
      status: "submitted",
      submitted_by: 3,
      items: [
        { id: 11, expense_date: "2026-10-15", vendor: "Caterer", description: "Snacks", receipt_number: "OR-1", amount: 5000, posted_expense_id: null, update: item1Update },
        { id: 12, expense_date: "2026-10-15", vendor: "PrintShop", description: "Banners", receipt_number: "OR-2", amount: 3200, posted_expense_id: null, update: item2Update },
      ],
      update: liqUpdate,
    });
    models.EventCashAdvance.findOne.mockResolvedValue({ id: 5, status: "released", fund_id: 1, account_id: 2, update: advUpdate });
    models.Expense.create
      .mockResolvedValueOnce({ id: 501 })
      .mockResolvedValueOnce({ id: 502 });

    const res = await eventWorkspace.verifyAndPostLiquidation(1, 7, {}, { userId: 4 });
    expect(res.posted_expense_ids).toEqual([501, 502]);
    expect(models.Expense.create).toHaveBeenCalledTimes(2);
    expect(item1Update).toHaveBeenCalledWith({ posted_expense_id: 501 }, expect.any(Object));
    expect(advUpdate).toHaveBeenCalledWith({ status: "liquidated" }, expect.any(Object));
    expect(liqUpdate).toHaveBeenCalledWith(expect.objectContaining({ status: "posted" }), expect.any(Object));

    // Attempting a second post on already-posted liquidation must throw 409 conflict
    models.EventLiquidation.findOne.mockResolvedValue({ id: 7, status: "posted", items: [] });
    await expect(eventWorkspace.verifyAndPostLiquidation(1, 7, {}, { userId: 4 })).rejects.toMatchObject({ status: 409 });
  });
});
