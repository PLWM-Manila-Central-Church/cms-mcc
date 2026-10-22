"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { createRecordSchema, createExpenseSchema, createExpenseCategorySchema } = require("../src/validators/finance.validator");

test("accepts a valid giving record without an obsolete type field", () => {
  const payload = {
    member_id: 1,
    category_id: 1,
    amount: 100,
    payment_method: "cash",
    transaction_date: "2026-06-04",
    receipt_number: "OR-1001",
    notes: "Sunday giving",
  };

  const { error, value } = createRecordSchema.validate(payload, {
    abortEarly: true,
    stripUnknown: true,
  });

  assert.equal(error, undefined);
  assert.equal(value.member_id, payload.member_id);
  assert.equal(value.category_id, payload.category_id);
  assert.equal(value.amount, payload.amount);
  assert.equal(value.receipt_number, payload.receipt_number);
  assert.equal(value.notes, payload.notes);
  assert.equal(value.type, undefined);
});

test("accepts a giving record without a member only when it is marked anonymous", () => {
  const { error, value } = createRecordSchema.validate({
    is_anonymous: true,
    member_id: null,
    category_id: 1,
    amount: 250,
    transaction_date: "2026-10-08",
  });

  assert.equal(error, undefined);
  assert.equal(value.is_anonymous, true);
  assert.equal(value.member_id, null);
});

test("rejects an unlinked giving record without anonymous intent", () => {
  const { error } = createRecordSchema.validate({
    is_anonymous: false,
    member_id: null,
    category_id: 1,
    amount: 250,
    transaction_date: "2026-10-08",
  });

  assert.ok(error);
});

test("rejects a member-linked record marked anonymous", () => {
  const { error } = createRecordSchema.validate({
    is_anonymous: true,
    member_id: 4,
    category_id: 1,
    amount: 250,
    transaction_date: "2026-10-08",
  });

  assert.ok(error);
});

test("accepts an account-free expense record", () => {
  const { error, value } = createExpenseSchema.validate({
    category_id: 7,
    date: "2026-10-20",
    amount: 125.5,
    payment_method_id: 2,
    description: "Office supplies",
  });

  assert.equal(error, undefined);
  assert.equal(value.category_id, 7);
  assert.equal(value.account_id, undefined);
});

test("rejects account_id in an expense payload", () => {
  const { error } = createExpenseSchema.validate({
    account_id: 4,
    category_id: 7,
    date: "2026-10-20",
    amount: 125.5,
    payment_method_id: 2,
  });

  assert.ok(error);
});

test("creates an expense category without an account", () => {
  const { error, value } = createExpenseCategorySchema.validate({ category_name: "Utilities" });
  assert.equal(error, undefined);
  assert.equal(value.account_id, undefined);
});
