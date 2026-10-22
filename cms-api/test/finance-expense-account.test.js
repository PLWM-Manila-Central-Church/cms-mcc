"use strict";

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => callback({ id: "test-transaction" })),
}));
jest.mock("../src/helpers/cache.helper", () => ({ keys: jest.fn(() => []), del: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
jest.mock("../src/middlewares/upload-s3", () => ({ deleteStoredFile: jest.fn() }));
jest.mock("../src/models", () => ({
  FinancialRecord: {},
  FinancialCategory: {},
  Member: {},
  User: {},
  Fund: {},
  Account: { findByPk: jest.fn() },
  ExpenseCategory: { findByPk: jest.fn() },
  PaymentMethod: { findByPk: jest.fn() },
  Expense: { create: jest.fn(), findOne: jest.fn(), findByPk: jest.fn() },
  Attachment: {},
}));

const { Account, ExpenseCategory, PaymentMethod, Expense } = require("../src/models");
const auditLog = require("../src/helpers/auditLog.helper");
const financeService = require("../src/services/finance.service");

describe("expense entries do not use finance accounts", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    ExpenseCategory.findByPk.mockResolvedValue({ id: 9, account_id: null, category_name: "Supplies" });
    PaymentMethod.findByPk.mockResolvedValue({ id: 2, method_name: "Cash" });
  });

  test("creates an expense with no account assignment", async () => {
    const created = { id: 101, account_id: null, category_id: 9 };
    Expense.create.mockImplementation(async (values) => Object.assign(created, values));
    Expense.findOne.mockResolvedValue(created);

    await financeService.createExpense({
      category_id: 9,
      date: "2026-10-20",
      amount: 125,
      payment_method_id: 2,
    }, 77);

    expect(Expense.create).toHaveBeenCalledWith(expect.objectContaining({ account_id: null, category_id: 9 }), {
      transaction: { id: "test-transaction" },
    });
    expect(Account.findByPk).not.toHaveBeenCalled();
  });

  test("updates expense details without changing a legacy account link", async () => {
    const existing = {
      id: 101,
      account_id: 4,
      category_id: 8,
      update: jest.fn(async (values) => Object.assign(existing, values)),
    };
    Expense.findByPk.mockResolvedValue(existing);
    Expense.findOne.mockResolvedValue(existing);
    await financeService.updateExpense(101, { category_id: 9, amount: 150 }, 77);

    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ category_id: 9, amount: 150 }), {
      transaction: { id: "test-transaction" },
    });
    expect(existing.update.mock.calls[0][0]).not.toHaveProperty("account_id");
    expect(existing.account_id).toBe(4);
  });

  test("archives an expense without destroying the record or its receipt ownership", async () => {
    const existing = {
      id: 101,
      update: jest.fn().mockResolvedValue(undefined),
    };
    Expense.findByPk.mockResolvedValue(existing);

    await expect(financeService.archiveExpense(101, 77)).resolves.toMatchObject({
      message: expect.stringMatching(/archived/i),
    });

    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({
      is_deleted: 1,
      deleted_at: expect.any(Date),
      deleted_by: 77,
    }), expect.objectContaining({ transaction: expect.any(Object) }));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "ARCHIVE_EXPENSE",
      targetTable: "expenses",
      targetId: 101,
    }), expect.any(Object));
    expect(existing.destroy).toBeUndefined();
  });
});
