"use strict";

jest.mock("../src/config/db", () => ({ query: jest.fn(), QueryTypes: { SELECT: "SELECT" } }));
jest.mock("../src/models", () => ({
  Member: { count: jest.fn() },
  FinancialRecord: { findAll: jest.fn() },
  Expense: { findAll: jest.fn() },
  Attendance: { findAll: jest.fn() },
}));
jest.mock("../src/helpers/attendanceSummary.helper", () => ({ getAttendanceModel: jest.fn() }));
jest.mock("../src/helpers/scopedLeader.helper", () => ({
  getMemberScopeWhere: jest.fn(),
  isScopedLeader: jest.fn(),
}));
jest.mock("../src/modules/qr-attendance/featureSettings", () => ({ getQrSchemaReadiness: jest.fn().mockResolvedValue({ ready: false }) }));

const sequelize = require("../src/config/db");
const { Member, Attendance, FinancialRecord, Expense } = require("../src/models");
const { getAttendanceModel } = require("../src/helpers/attendanceSummary.helper");
const { getMemberScopeWhere, isScopedLeader } = require("../src/helpers/scopedLeader.helper");
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

  test("denies a nonleader from the team-scoped attendance endpoint", async () => {
    isScopedLeader.mockReturnValue(false);
    await expect(analyticsService.getTeamAttendanceAnalytics({
      user: { roleName: "Finance Team" },
    })).rejects.toMatchObject({ status: 403 });
    expect(Attendance.findAll).not.toHaveBeenCalled();
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
      period: "custom",
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

  test("returns Sunday-start weekly buckets for a monthly report while preserving range totals", async () => {
    Member.count.mockResolvedValueOnce(2).mockResolvedValueOnce(0).mockResolvedValueOnce(2);
    Attendance.findAll.mockResolvedValue([
      { period: "2026-10-04", total: 2 },
      { period: "2026-10-05", total: 1 },
      { period: "2026-10-11", total: 4 },
    ]);
    getAttendanceModel.mockResolvedValue(Attendance);
    sequelize.query.mockImplementation(async (sql) => {
      if (sql.includes("TIMESTAMPDIFF(YEAR")) return [{ label: "18-29", total: 2 }];
      if (sql.includes("NULLIF(gender")) return [{ label: "Unspecified", total: 2 }];
      if (sql.includes("SELECT cg.id") || sql.includes("SELECT g.id")) return [];
      if (sql.includes("AS cell_group_categories") || sql.includes("AS member_group_categories")) return [{ category_count: 0 }];
      if (sql.includes("DATE_FORMAT(created_at")) return [
        { period: "2026-10-04", total: 1 },
        { period: "2026-10-11", total: 1 },
      ];
      return [];
    });

    const result = await analyticsService.getAnalytics({
      user: { roleName: "Registration Team" },
      date_from: "2026-10-04",
      date_to: "2026-10-12",
      period: "month",
    });

    expect(result.period).toEqual({ preset: "month", bucket: "week" });
    expect(result.attendance.service_checkins).toBe(7);
    expect(result.attendance.buckets).toEqual([
      { period: "2026-10-04", service: 3, events: 0 },
      { period: "2026-10-11", service: 4, events: 0 },
    ]);
    expect(result.member_growth).toEqual([
      { period: "2026-10-04", total: 1 },
      { period: "2026-10-11", total: 1 },
    ]);
  });

  test("returns financial totals and weekly buckets without exposing other report sections to Finance Team", async () => {
    FinancialRecord.findAll.mockResolvedValue([
      { period: "2026-10-04", total: "500.00" },
      { period: "2026-10-11", total: "300.00" },
    ]);
    Expense.findAll.mockResolvedValue([
      { period: "2026-10-06", total: "50.00" },
    ]);

    const result = await analyticsService.getAnalytics({
      user: { roleName: "Finance Team" },
      date_from: "2026-10-04",
      date_to: "2026-10-12",
      period: "month",
    });

    expect(result.finance).toEqual({
      income: 800,
      expenses: 50,
      net: 750,
      buckets: [
        { period: "2026-10-04", income: 500, expenses: 50 },
        { period: "2026-10-11", income: 300, expenses: 0 },
      ],
    });
    expect(result.members).toBeNull();
    expect(result.attendance).toBeNull();
  });

  test("limits Leader attendance aggregates through the assigned Member scope", async () => {
    isScopedLeader.mockReturnValue(true);
    getMemberScopeWhere.mockResolvedValue({ cell_group_id: 44 });
    getAttendanceModel.mockResolvedValue(Attendance);
    Attendance.findAll.mockResolvedValue([
      { period: "2026-10-04", total: 2 },
      { period: "2026-10-11", total: 3 },
    ]);

    const result = await analyticsService.getTeamAttendanceAnalytics({
      user: { roleName: "Cell Group Leader", leadsCellGroupId: 44 },
      date_from: "2026-10-04",
      date_to: "2026-10-12",
      period: "month",
    });

    expect(getMemberScopeWhere).toHaveBeenCalledWith(expect.objectContaining({ roleName: "Cell Group Leader" }));
    expect(Attendance.findAll).toHaveBeenCalledWith(expect.objectContaining({
      include: [expect.objectContaining({ where: { cell_group_id: 44 }, required: true })],
    }));
    expect(result.attendance.buckets).toEqual([
      { period: "2026-10-04", service: 2, events: 0 },
      { period: "2026-10-11", service: 3, events: 0 },
    ]);
  });
});
