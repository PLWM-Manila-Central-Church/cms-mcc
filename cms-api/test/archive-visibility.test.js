"use strict";

const {
  canAccessArchiveRecord,
  canViewArchiveVisibility,
} = require("../src/helpers/archiveVisibility.helper");

describe("archive visibility policy", () => {
  test("allows every authenticated module reader to view public records", () => {
    expect(canViewArchiveVisibility("public", "Member")).toBe(true);
    expect(canViewArchiveVisibility("public", "System Admin")).toBe(true);
  });

  test("allows only the existing restricted-role set to view restricted records", () => {
    for (const role of [
      "System Admin",
      "Pastor",
      "Finance Team",
      "Registration Team",
      "Ministry Leader",
      "Cell Group Leader",
      "Group Leader",
      "Leader",
    ]) {
      expect(canViewArchiveVisibility("restricted", role)).toBe(true);
    }

    expect(canViewArchiveVisibility("restricted", "Member")).toBe(false);
    expect(canViewArchiveVisibility("restricted", undefined)).toBe(false);
  });

  test("limits confidential records to System Admin and Pastor", () => {
    expect(canViewArchiveVisibility("confidential", "System Admin")).toBe(true);
    expect(canViewArchiveVisibility("confidential", "Pastor")).toBe(true);
    expect(canViewArchiveVisibility("confidential", "Finance Team")).toBe(false);
    expect(canViewArchiveVisibility("confidential", "Member")).toBe(false);
  });

  test("denies unknown visibility values", () => {
    expect(canViewArchiveVisibility("unknown", "System Admin")).toBe(false);
  });

  test("limits Finance Team to the Financial Records category", () => {
    expect(canAccessArchiveRecord({ visibility: "restricted", category: { name: "Financial Records" } }, "Finance Team")).toBe(true);
    expect(canAccessArchiveRecord({ visibility: "public", category: { name: "Member Documents" } }, "Finance Team")).toBe(false);
    expect(canAccessArchiveRecord({ visibility: "confidential", category: { name: "Financial Records" } }, "Finance Team")).toBe(false);
    expect(canAccessArchiveRecord({ visibility: "confidential", category: { name: "Member Documents" } }, "Pastor")).toBe(true);
  });
});
