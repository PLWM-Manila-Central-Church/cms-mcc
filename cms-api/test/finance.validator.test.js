"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");

const { createRecordSchema } = require("../src/validators/finance.validator");

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
