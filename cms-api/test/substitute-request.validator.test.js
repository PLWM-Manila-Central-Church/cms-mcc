"use strict";

const { createSubstituteRequestSchema } = require("../src/validators/substituteRequests.validator");

describe("substitute request validator", () => {
  test("accepts a service, a trimmed reason, and an optional proposed Member ID", () => {
    const result = createSubstituteRequestSchema.validate({
      service_id: "8",
      reason: "  I cannot serve this Sunday.  ",
      proposed_member_id: "202",
    });

    expect(result.error).toBeUndefined();
    expect(result.value).toEqual({
      service_id: 8,
      reason: "I cannot serve this Sunday.",
      proposed_member_id: 202,
    });
  });

  test("rejects missing service, too-short reason, and invalid proposed IDs", () => {
    expect(createSubstituteRequestSchema.validate({ reason: "Need a substitute." }).error).toBeDefined();
    expect(createSubstituteRequestSchema.validate({ service_id: 8, reason: "No" }).error).toBeDefined();
    expect(createSubstituteRequestSchema.validate({ service_id: 8, reason: "Need a substitute.", proposed_member_id: 0 }).error).toBeDefined();
  });
});
