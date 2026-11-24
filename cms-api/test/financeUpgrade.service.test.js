"use strict";

jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/config/db", () => ({ query: jest.fn().mockResolvedValue([]) }));
jest.mock("../src/models", () => ({
  Fund: { findAll: jest.fn() },
  Account: { findAll: jest.fn(), sum: jest.fn() },
  FinancialRecord: { findAll: jest.fn(), sum: jest.fn() },
  FinancialCategory: {},
  Expense: { findAll: jest.fn(), findByPk: jest.fn(), create: jest.fn(), sum: jest.fn() },
  ExpenseCategory: {},
  PaymentMethod: {},
  FinanceTransfer: { findAll: jest.fn(), create: jest.fn(), findByPk: jest.fn(), sum: jest.fn() },
  FinanceApproval: { create: jest.fn().mockResolvedValue({ id: 1 }) },
  Event: {},
  MinistryGroup: {},
  User: {},
}));

const models = require("../src/models");
const financeUpgrade = require("../src/services/financeUpgrade.service");

describe("Phase 3 — Church Finance Upgrade service", () => {
  beforeEach(() => jest.clearAllMocks());

  test("computes account balances with transfers without inflating income or expenses", async () => {
    models.Account.findAll.mockResolvedValue([
      { toJSON: () => ({ id: 1, name: "Cash on Hand", opening_balance: 5000 }) },
      { toJSON: () => ({ id: 2, name: "BPI Bank", opening_balance: 10000 }) },
    ]);
    models.FinancialRecord.findAll.mockResolvedValue([{ account_id: 1, total: 3000 }]);
    models.Expense.findAll.mockResolvedValue([{ account_id: 2, total: 2000 }]);
    models.FinanceTransfer.findAll
      .mockResolvedValueOnce([{ to_account_id: 2, total: 4000 }]) // transfers in
      .mockResolvedValueOnce([{ from_account_id: 1, total: 4000 }]); // transfers out

    const rows = await financeUpgrade.listAccountsWithBalances();
    expect(rows[0].current_balance).toBe(4000); // 5000 + 3000 - 4000
    expect(rows[1].current_balance).toBe(12000); // 10000 - 2000 + 4000
  });

  test("rejects transfer when source and destination accounts match", async () => {
    await expect(
      financeUpgrade.createTransfer({ amount: 500, from_account_id: 1, to_account_id: 1 }, { userId: 1 })
    ).rejects.toMatchObject({ status: 400 });
  });

  test("enforces maker-checker approval and separates Approved from Paid", async () => {
    const update = jest.fn();
    models.Expense.findByPk.mockResolvedValue({ id: 9, status: "pending_approval", requested_by: 5, update });

    // Non-admin requester cannot approve their own expense
    await expect(
      financeUpgrade.transitionExpenseStatus(9, "approve", {}, { userId: 5, roleName: "Finance Team" })
    ).rejects.toMatchObject({ status: 403 });

    // Different approver approves -> status becomes 'approved' (NOT paid yet)
    await financeUpgrade.transitionExpenseStatus(9, "approve", {}, { userId: 2, roleName: "Pastor" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "approved", approved_by: 2 }));

    // Only 'approved' can be marked paid
    models.Expense.findByPk.mockResolvedValue({ id: 9, status: "approved", requested_by: 5, update });
    await financeUpgrade.transitionExpenseStatus(9, "mark-paid", { payment_reference: "CHK-101" }, { userId: 3, roleName: "Finance Team" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "paid", paid_by: 3, payment_reference: "CHK-101" }));
  });

  test("calculates Consolidated Financial Statement: Ending = Beginning + Income - Paid Expenses", async () => {
    models.Account.sum.mockResolvedValue(20000);
    models.FinancialRecord.sum
      .mockResolvedValueOnce(5000) // prior income
      .mockResolvedValueOnce(12000); // period income
    models.Expense.sum
      .mockResolvedValueOnce(2000) // prior paid expenses
      .mockResolvedValueOnce(4500); // period paid expenses
    models.FinanceTransfer.sum.mockResolvedValue(3000);

    const stmt = await financeUpgrade.getConsolidatedStatement({ date_from: "2026-10-01", date_to: "2026-10-31" });
    expect(stmt.beginning_balance).toBe(23000); // 20000 + 5000 - 2000
    expect(stmt.total_income).toBe(12000);
    expect(stmt.total_expenses).toBe(4500);
    expect(stmt.ending_balance).toBe(30500); // 23000 + 12000 - 4500 (transfers excluded!)
    expect(stmt.internal_transfers_excluded).toBe(3000);
  });
});
