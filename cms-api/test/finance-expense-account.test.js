"use strict";

const state = {};

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
const financeService = require("../src/services/finance.service");

describe("expense account derives from its selected category", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Account.findByPk.mockResolvedValue({ id: 5, name: "Operating Account" });
    ExpenseCategory.findByPk.mockResolvedValue({ id: 9, account_id: 5, category_name: "Supplies" });
    PaymentMethod.findByPk.mockResolvedValue({ id: 2, method_name: "Cash" });
  });

  test("creates an expense without a client-supplied account_id", async () => {
    const created = { id: 101, account_id: 5, category_id: 9 };
    Expense.create.mockImplementation(async (values) => Object.assign(created, values));
    Expense.findOne.mockResolvedValue(created);

    await financeService.createExpense({
      category_id: 9,
      date: "2026-10-20",
      amount: 125,
      payment_method_id: 2,
    }, 77);

    expect(Expense.create).toHaveBeenCalledWith(expect.objectContaining({ account_id: 5, category_id: 9 }), {
      transaction: { id: "test-transaction" },
    });
  });

  test("rejects a mismatched legacy account_id before creating an expense", async () => {
    await expect(financeService.createExpense({
      account_id: 8,
      category_id: 9,
      date: "2026-10-20",
      amount: 125,
      payment_method_id: 2,
    }, 77)).rejects.toMatchObject({ code: "CATEGORY_ACCOUNT_MISMATCH" });
    expect(Expense.create).not.toHaveBeenCalled();
  });

  test("updates account_id from the selected category even when the client omits it", async () => {
    const existing = {
      id: 101,
      account_id: 4,
      category_id: 8,
      update: jest.fn(async (values) => Object.assign(existing, values)),
    };
    Expense.findByPk.mockResolvedValue(existing);
    Expense.findOne.mockResolvedValue(existing);
    await financeService.updateExpense(101, { category_id: 9, amount: 150 }, 77);

    expect(existing.update).toHaveBeenCalledWith(expect.objectContaining({ account_id: 5, category_id: 9 }), {
      transaction: { id: "test-transaction" },
    });
  });
});
