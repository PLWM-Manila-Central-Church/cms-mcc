"use strict";

const mockState = { member: null, query: null };

jest.mock("../src/config/db", () => ({
  query: (...args) => mockState.query(...args),
  QueryTypes: { SELECT: "SELECT" },
}));
jest.mock("../src/helpers/scopedLeader.helper", () => ({ isGlobalMemberReader: () => true }));
jest.mock("../src/models", () => ({
  Member: { findOne: jest.fn(async () => mockState.member) },
  CellGroup: {},
  Event: {},
  EventRegistration: {},
  Group: {},
  Service: {},
  ServiceResponse: {},
}));
jest.mock("../src/modules/qr-attendance/featureSettings", () => ({
  getQrSchemaReadiness: jest.fn(async () => ({ ready: true })),
}));
jest.mock("../src/modules/qr-attendance/models", () => ({
  EventAttendance: {},
  QrAttendanceSession: {},
  QrServiceAttendance: {},
}));

const service = require("../src/services/pastor-attendance.service");

describe("Pastor member attendance history date bounds", () => {
  beforeEach(() => {
    mockState.member = { id: 464452, first_name: "QA", last_name: "Member", status: "Active" };
    mockState.query = jest.fn()
      .mockResolvedValueOnce([{ total: 1 }])
      .mockResolvedValueOnce([{
        attendance_id: 210001,
        activity_type: "service",
        activity_id: 10150003,
        activity_title: "QA Service",
        activity_date: "2026-10-10",
        checked_in_at: "2026-10-09T17:55:04.000Z",
        confirmed_at: "2026-10-09T17:55:04.000Z",
        check_in_method: "barcode",
        entry_source: "direct",
        voided_at: null,
        session_id: 210001,
        session_title: "QA Service Session",
      }]);
  });

  test("uses explicit UTC SQL date-times for an inclusive Manila date range", async () => {
    const result = await service.getPastorMemberHistory(464452, {
      from: "2026-10-10",
      to: "2026-10-10",
      activity_type: "service",
    }, { roleName: "Pastor" });

    expect(mockState.query).toHaveBeenNthCalledWith(1,
      expect.stringContaining("a.checked_in_at >= :rangeStart"),
      expect.objectContaining({
        replacements: {
          memberId: 464452,
          rangeStart: "2026-10-09 16:00:00",
          rangeEnd: "2026-10-10 16:00:00",
        },
        type: "SELECT",
      }),
    );
    expect(result.records).toEqual([
      expect.objectContaining({
        activity_type: "service",
        activity_id: 10150003,
        status: "confirmed",
      }),
    ]);
  });
});
