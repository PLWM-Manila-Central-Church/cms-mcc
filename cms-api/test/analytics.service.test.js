"use strict";

jest.mock("../src/config/db", () => ({ query: jest.fn(), QueryTypes: { SELECT: "SELECT" } }));
jest.mock("../src/models", () => ({ Member: {}, FinancialRecord: {}, Expense: {}, Attendance: {} }));
jest.mock("../src/helpers/attendanceSummary.helper", () => ({ getAttendanceModel: jest.fn() }));

const analyticsService = require("../src/services/analytics.service");

describe("consolidated analytics access and range checks", () => {
  test("rejects roles outside the reporting allowlist before querying data", async () => {
    await expect(analyticsService.getAnalytics({ user: { roleName: "Leader" } })).rejects.toMatchObject({ status: 403 });
  });

  test("rejects an impossible calendar date before querying data", async () => {
    await expect(analyticsService.getAnalytics({
      user: { roleName: "System Admin" },
      date_from: "2026-02-30",
      date_to: "2026-03-31",
    })).rejects.toMatchObject({ status: 400 });
  });
});
