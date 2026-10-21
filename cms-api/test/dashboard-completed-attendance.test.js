"use strict";

jest.mock("../src/config/db", () => ({ literal: (value) => value }));
jest.mock("../src/helpers/cache.helper", () => ({ get: jest.fn(), set: jest.fn() }));
jest.mock("../src/helpers/attendanceSummary.helper", () => ({ getAttendanceModel: jest.fn() }));
jest.mock("../src/models", () => {
  const model = () => ({ count: jest.fn().mockResolvedValue(0), sum: jest.fn().mockResolvedValue(0), findAll: jest.fn().mockResolvedValue([]), findOne: jest.fn().mockResolvedValue(null) });
  return Object.fromEntries(["Member", "FinancialRecord", "FinancialCategory", "Service", "Event", "InventoryItem", "InventoryRequest", "AuditLog", "User", "ArchiveRecord", "InvitedMember", "MinistryMembership", "MinistryEventInvite", "Attendance", "CellGroup"].map((name) => [name, model()]));
});
jest.mock("../src/helpers/scopedLeader.helper", () => ({ getMemberScopeWhere: jest.fn(), getScope: jest.fn() }));

const { Op } = require("sequelize");
const { Service, Attendance } = require("../src/models");
const { getAttendanceModel } = require("../src/helpers/attendanceSummary.helper");
const service = require("../src/services/dashboard.service");

test("registration absence alerts exclude upcoming and unfinished services at the Manila date boundary", async () => {
  jest.useFakeTimers().setSystemTime(new Date("2026-10-20T17:00:00Z"));
  try {
    getAttendanceModel.mockResolvedValue(Attendance);
    const result = await service.getStats({ roleName: "Registration Team", userId: 1 });
    expect(Service.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { status: "completed", is_deleted: 0, service_date: { [Op.lte]: "2026-10-21" } },
    }));
    expect(result.latestService).toBeNull();
    expect(result.cellGroupAbsences).toEqual([]);
  } finally { jest.useRealTimers(); }
});
