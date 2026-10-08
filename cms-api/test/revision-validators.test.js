"use strict";

const {
  createItemSchema,
  createRequestSchema,
} = require("../src/validators/inventory.validator");
const { createMemberSchema, createMemberStatusHistorySchema } = require("../src/validators/members.validator");
const { createRecordSchema } = require("../src/validators/finance.validator");
const { createApplicationSchema, reviewApplicationSchema } = require("../src/validators/ministry-applications.validator");
const analyticsQuerySchema = require("../src/validators/analytics.validator");

describe("system revision validators", () => {
  test("accepts inventory repair state and preserves condition and low-stock settings", () => {
    const { error, value } = createItemSchema.validate({
      name: "Projector",
      quantity: 2,
      unit: "pcs",
      condition: "Poor",
      status: "Under Repair",
      low_stock_threshold: 1,
      notes: "Lamp replacement requested",
    }, { stripUnknown: true });
    expect(error).toBeUndefined();
    expect(value.status).toBe("Under Repair");
    expect(value.condition).toBe("Poor");
  });

  test("accepts one inventory request link and rejects linking multiple contexts", () => {
    const base = { item_id: 1, quantity: 1, purpose: "Sound for service" };
    expect(createRequestSchema.validate({ ...base, service_id: 7 }).error).toBeUndefined();
    expect(createRequestSchema.validate({ ...base, event_id: 5, service_id: 7 }).error).toBeDefined();
  });

  test("limits current member status to Active or Inactive while retaining legacy history values", () => {
    expect(createMemberSchema.validate({ first_name: "A", last_name: "B", status: "Active" }).error).toBeUndefined();
    expect(createMemberSchema.validate({ first_name: "A", last_name: "B", status: "Semi-Active" }).error).toBeDefined();
    expect(createMemberStatusHistorySchema.validate({ status: "Inactive" }).error).toBeUndefined();
    expect(createMemberStatusHistorySchema.validate({ status: "New" }).error).toBeDefined();
  });

  test("requires explicit anonymous intent when there is no giver member", () => {
    const record = { category_id: 1, amount: 100, transaction_date: "2026-10-08" };
    expect(createRecordSchema.validate({ ...record, is_anonymous: true }).error).toBeUndefined();
    expect(createRecordSchema.validate({ ...record, is_anonymous: false }).error).toBeDefined();
    expect(createRecordSchema.validate({ ...record, is_anonymous: true, member_id: 4 }).error).toBeDefined();
  });

  test("validates application review decisions and date filter shape", () => {
    expect(createApplicationSchema.validate({ ministry_role_id: 2, message: "I can help" }).error).toBeUndefined();
    expect(reviewApplicationSchema.validate({ status: "rejected", review_note: "Not available now" }).error).toBeUndefined();
    expect(reviewApplicationSchema.validate({ status: "rejected", review_note: "No" }).error).toBeDefined();
    expect(analyticsQuerySchema.validate({ date_from: "2026-01-01", date_to: "2026-12-31" }).error).toBeUndefined();
    expect(analyticsQuerySchema.validate({ date_from: "2026-01" }).error).toBeDefined();
  });
});
