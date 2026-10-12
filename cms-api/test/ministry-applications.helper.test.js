"use strict";

const { getLatestApplicationsByRole } = require("../src/helpers/ministryApplications.helper");

describe("ministry application history", () => {
  test("selects the highest-ID application per ministry when timestamps are absent", () => {
    const older = { id: 4, ministry_role_id: 2, status: "rejected" };
    const newer = { id: 9, ministry_role_id: 2, status: "pending" };
    const otherRole = { id: 7, ministry_role_id: 3, status: "withdrawn" };

    const latest = getLatestApplicationsByRole([newer, older, otherRole]);

    expect(latest.get(2)).toBe(newer);
    expect(latest.get(3)).toBe(otherRole);
    expect(latest.size).toBe(2);
  });

  test("ignores malformed ministry role IDs without affecting valid histories", () => {
    const valid = { id: 1, ministry_role_id: "5", status: "pending" };

    const latest = getLatestApplicationsByRole([
      { id: 10, ministry_role_id: "invalid", status: "pending" },
      valid,
    ]);

    expect(latest.get(5)).toBe(valid);
    expect(latest.size).toBe(1);
  });
});
