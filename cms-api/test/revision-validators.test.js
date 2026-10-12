"use strict";

const {
  createItemSchema,
  createRequestSchema,
  createUsageSchema,
  getUsageQuerySchema,
} = require("../src/validators/inventory.validator");
const { createMemberSchema, createMemberStatusHistorySchema } = require("../src/validators/members.validator");
const { createRecordSchema, searchGivingMembersQuerySchema } = require("../src/validators/finance.validator");
const { createApplicationSchema, reviewApplicationSchema } = require("../src/validators/ministry-applications.validator");
const analyticsQuerySchema = require("../src/validators/analytics.validator");
const { updateProfileSchema, getMyFinanceQuerySchema } = require("../src/validators/member-portal.validator");
const { createUserSchema } = require("../src/validators/users.validator");

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
    expect(createRequestSchema.validate({ ...base, request_key: "f6e2be7a-dfea-44d8-9ad4-65be9cc31b0a" }).error).toBeUndefined();
    expect(createRequestSchema.validate({ ...base, request_key: "invalid request key" }).error).toBeDefined();
  });

  test("accepts the canonical inventory usage fields and legacy aliases without ambiguity", () => {
    expect(createUsageSchema.validate({ item_id: 1, quantity_used: 2, used_at: "2026-10-08T14:00:00.000Z" }).error).toBeUndefined();
    expect(createUsageSchema.validate({ item_id: 1, quantity: 2, used_date: "2026-10-08T14:00:00.000Z" }).error).toBeUndefined();
    expect(createUsageSchema.validate({ item_id: 1 }).error).toBeDefined();
    expect(createUsageSchema.validate({ item_id: 1, quantity: 1, quantity_used: 1 }).error).toBeDefined();
    expect(getUsageQuerySchema.validate({ page: 1, limit: 100 }).error).toBeUndefined();
    expect(getUsageQuerySchema.validate({ page: 1, limit: 101 }).error).toBeDefined();
  });

  test("limits current member status to Active or Inactive while retaining legacy history values", () => {
    expect(createMemberSchema.validate({ first_name: "A", last_name: "B", status: "Active" }).error).toBeUndefined();
    expect(createMemberSchema.validate({ first_name: "A", last_name: "B", status: "Semi-Active" }).error).toBeDefined();
    expect(createMemberStatusHistorySchema.validate({ status: "Inactive" }).error).toBeUndefined();
    expect(createMemberStatusHistorySchema.validate({ status: "New" }).error).toBeDefined();
  });

  test("keeps Gender values consistent with the member database enum", () => {
    expect(updateProfileSchema.validate({ gender: "Male" }).error).toBeUndefined();
    expect(updateProfileSchema.validate({ gender: "Other" }).error).toBeDefined();
    expect(updateProfileSchema.validate({ gender: "Prefer not to say" }).error).toBeDefined();
    expect(createUserSchema.validate({ email: "new@example.com", password: "StrongPass1", role_id: 1, gender: "Other" }).error).toBeDefined();
  });

  test("accepts valid member contact-email edits and rejects malformed addresses", () => {
    const updated = updateProfileSchema.validate({ email: "member.updated@example.com" });
    expect(updated.error).toBeUndefined();
    expect(updated.value.email).toBe("member.updated@example.com");
    expect(updateProfileSchema.validate({ email: "not-an-email" }).error).toBeDefined();
    expect(updateProfileSchema.validate({ email: "" }).error).toBeUndefined();
    expect(updateProfileSchema.validate({ email: null }).error).toBeUndefined();

    const portalForm = updateProfileSchema.validate({
      first_name: "Test",
      last_name: "Member",
      email: "member.updated@example.com",
      phone: "",
      address: "",
      birthdate: "",
      spiritual_birthday: "",
    });
    expect(portalForm.error).toBeUndefined();
    expect(updateProfileSchema.validate({ birthdate: "2026-02-30" }).error).toBeDefined();
  });

  test("validates member giving date ranges and bounds pagination", () => {
    const defaults = getMyFinanceQuerySchema.validate({});
    expect(defaults.error).toBeUndefined();
    expect(defaults.value).toMatchObject({ page: 1, limit: 20 });

    expect(getMyFinanceQuerySchema.validate({ date_from: "2026-10-09", date_to: "2026-10-09" }).error).toBeUndefined();
    expect(getMyFinanceQuerySchema.validate({ date_from: "2026-02-30" }).error).toBeDefined();
    expect(getMyFinanceQuerySchema.validate({ date_from: "2026-10-10", date_to: "2026-10-09" }).error).toBeDefined();
    expect(getMyFinanceQuerySchema.validate({ page: 0 }).error).toBeDefined();
    expect(getMyFinanceQuerySchema.validate({ limit: 101 }).error).toBeDefined();
  });

  test("requires explicit anonymous intent when there is no giver member", () => {
    const record = { category_id: 1, amount: 100, transaction_date: "2026-10-08" };
    expect(createRecordSchema.validate({ ...record, is_anonymous: true }).error).toBeUndefined();
    expect(createRecordSchema.validate({ ...record, is_anonymous: false }).error).toBeDefined();
    expect(createRecordSchema.validate({ ...record, is_anonymous: true, member_id: 4 }).error).toBeDefined();
  });

  test("limits finance member lookup to a short query and a small result set", () => {
    expect(searchGivingMembersQuerySchema.validate({ q: "CI" }).error).toBeUndefined();
    expect(searchGivingMembersQuerySchema.validate({ q: "A" }).error).toBeDefined();
    expect(searchGivingMembersQuerySchema.validate({ q: "CI", limit: 11 }).error).toBeDefined();
  });

  test("validates application review decisions and date filter shape", () => {
    expect(createApplicationSchema.validate({ ministry_role_id: 2, message: "I can help" }).error).toBeUndefined();
    expect(reviewApplicationSchema.validate({ status: "rejected", review_note: "Not available now" }).error).toBeUndefined();
    expect(reviewApplicationSchema.validate({ status: "rejected", review_note: "No" }).error).toBeDefined();
    expect(analyticsQuerySchema.validate({ date_from: "2026-01-01", date_to: "2026-12-31" }).error).toBeUndefined();
    expect(analyticsQuerySchema.validate({ date_from: "2026-01" }).error).toBeDefined();
  });
});
