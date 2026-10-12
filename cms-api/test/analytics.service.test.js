"use strict";

jest.mock("../src/config/db", () => ({ query: jest.fn(), QueryTypes: { SELECT: "SELECT" } }));
jest.mock("../src/models", () => ({
  Member: { count: jest.fn() },
  FinancialRecord: {},
  Expense: {},
  Attendance: { findAll: jest.fn() },
}));
jest.mock("../src/helpers/attendanceSummary.helper", () => ({ getAttendanceModel: jest.fn() }));

const sequelize = require("../src/config/db");
const { Member, Attendance } = require("../src/models");
const { getAttendanceModel } = require("../src/helpers/attendanceSummary.helper");
const analyticsService = require("../src/services/analytics.service");

describe("consolidated analytics access and range checks", () => {
  beforeEach(() => jest.clearAllMocks());

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

  test("reconciles top-20 group charts to the full member denominator and uses Manila age date", async () => {
    const topCellGroups = Array.from({ length: 20 }, (_, index) => ({ id: index + 1, label: `Cell ${index + 1}`, total: 2 }));
    const topGroups = Array.from({ length: 20 }, (_, index) => ({ id: index + 1, label: `Group ${index + 1}`, total: 1 }));
    let ageQueryOptions = null;
    Member.count
      .mockResolvedValueOnce(90)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(100);
    Attendance.findAll.mockResolvedValue([]);
    getAttendanceModel.mockResolvedValue(Attendance);
    sequelize.query.mockImplementation(async (sql, options = {}) => {
      if (sql.includes("TIMESTAMPDIFF(YEAR")) {
        ageQueryOptions = options;
        return [{ label: "Unknown", total: 100 }];
      }
      if (sql.includes("NULLIF(gender")) return [{ label: "Unspecified", total: 100 }];
      if (sql.includes("AS cell_group_categories")) return [{ category_count: 25 }];
      if (sql.includes("AS member_group_categories")) return [{ category_count: 22 }];
      if (sql.includes("SELECT cg.id")) return topCellGroups;
      if (sql.includes("SELECT g.id")) return topGroups;
      if (sql.includes("DATE_FORMAT(created_at")) return [];
      return [];
    });

    const result = await analyticsService.getAnalytics({
      user: { roleName: "Registration Team" },
      date_from: "2026-10-01",
      date_to: "2026-10-11",
    });

    expect(result.members).toMatchObject({ total: 100, active: 90, inactive: 10 });
    expect(result.demographics.gender.reduce((sum, row) => sum + row.total, 0)).toBe(100);
    expect(result.demographics.age_bands.reduce((sum, row) => sum + row.total, 0)).toBe(100);
    expect(result.demographics.cell_groups).toHaveLength(21);
    expect(result.demographics.cell_groups.at(-1)).toEqual({ id: null, label: "Other (5 cell groups)", total: 60 });
    expect(result.demographics.cell_groups.reduce((sum, row) => sum + row.total, 0)).toBe(100);
    expect(result.demographics.groups).toHaveLength(21);
    expect(result.demographics.groups.at(-1)).toEqual({ id: null, label: "Other (2 groups)", total: 80 });
    expect(result.demographics.groups.reduce((sum, row) => sum + row.total, 0)).toBe(100);
    const manilaDateParts = Object.fromEntries(new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date()).map((part) => [part.type, part.value]));
    expect(ageQueryOptions.replacements.asOfDate)
      .toBe(`${manilaDateParts.year}-${manilaDateParts.month}-${manilaDateParts.day}`);
    expect(sequelize.query.mock.calls.find(([sql]) => sql.includes("TIMESTAMPDIFF(YEAR"))[0])
      .not.toContain("CURDATE()");
  });
});
