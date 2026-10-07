"use strict";

const mockModels = {
  Attendance: { count: jest.fn() },
  QrServiceAttendance: { count: jest.fn() },
  Service: { findByPk: jest.fn() },
  ServiceAttendanceSummary: { upsert: jest.fn() },
  getQrSchemaReadiness: jest.fn(),
};

jest.mock("../src/models", () => ({
  Attendance: mockModels.Attendance,
  Service: mockModels.Service,
  ServiceAttendanceSummary: mockModels.ServiceAttendanceSummary,
}));
jest.mock("../src/modules/qr-attendance/featureSettings", () => ({
  getQrSchemaReadiness: mockModels.getQrSchemaReadiness,
}));
jest.mock("../src/modules/qr-attendance/models", () => ({
  QrServiceAttendance: mockModels.QrServiceAttendance,
}));

const { getAttendanceModel, syncServiceAttendanceSummary } = require("../src/helpers/attendanceSummary.helper");

describe("legacy attendance summary while QR schema is optional", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockModels.Attendance.count.mockResolvedValue(3);
    mockModels.QrServiceAttendance.count.mockResolvedValue(3);
    mockModels.Service.findByPk.mockResolvedValue({ capacity: 25 });
    mockModels.ServiceAttendanceSummary.upsert.mockResolvedValue(undefined);
    mockModels.getQrSchemaReadiness.mockResolvedValue({ ready: false, missingCount: 6 });
  });

  it("falls back to the legacy model without selecting QR-only columns", async () => {
    expect(await getAttendanceModel()).toBe(mockModels.Attendance);
    await syncServiceAttendanceSummary(8);
    const where = mockModels.Attendance.count.mock.calls[0][0].where;
    expect(where.service_id).toBe(8);
    expect(where.voided_at).toBeUndefined();
    expect(mockModels.QrServiceAttendance.count).not.toHaveBeenCalled();
  });

  it("uses the QR model only after readiness and preserves service capacity semantics", async () => {
    mockModels.getQrSchemaReadiness.mockResolvedValue({ ready: true, missingCount: 0 });
    expect(await getAttendanceModel()).toBe(mockModels.QrServiceAttendance);
    await syncServiceAttendanceSummary(8);
    expect(mockModels.QrServiceAttendance.count.mock.calls[0][0].where.voided_at).toBeNull();
    expect(mockModels.ServiceAttendanceSummary.upsert.mock.calls[0][0]).toMatchObject({
      service_id: 8,
      total_expected: 25,
      total_attended: 3,
      total_absent: 22,
    });
  });
});
