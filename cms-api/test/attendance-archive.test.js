"use strict";

const mockTransaction = { LOCK: { UPDATE: "UPDATE" } };
const mockRecord = {
  id: 55,
  service_id: 21,
  member_id: 155,
  entry_source: "legacy",
  check_in_method: "manual",
  voided_at: null,
  voided_by: null,
  void_reason: null,
  update: jest.fn(async (values) => Object.assign(mockRecord, values)),
  destroy: jest.fn(),
};
const mockModels = {
  Attendance: {},
  Member: {},
  Service: {},
  User: {},
  QrServiceAttendance: {
    findByPk: jest.fn(),
    findOne: jest.fn(),
  },
  getAttendanceModel: jest.fn(),
  syncServiceAttendanceSummary: jest.fn(),
  transaction: jest.fn(async (callback) => callback(mockTransaction)),
  invalidateServiceFinalization: jest.fn(),
  auditLog: { log: jest.fn() },
  ensureMemberInScope: jest.fn(),
  getMemberScopeWhere: jest.fn(),
  assertLeaderMayUseLegacyServiceWrite: jest.fn(),
  cache: { keys: jest.fn(() => []), del: jest.fn() },
  logger: { error: jest.fn() },
  notifications: { notifyAttendanceRecorded: jest.fn() },
};

jest.mock("../src/models", () => ({
  Attendance: mockModels.Attendance,
  Member: mockModels.Member,
  Service: mockModels.Service,
  User: mockModels.User,
}));
jest.mock("../src/config/db", () => ({ transaction: mockModels.transaction }));
jest.mock("../src/helpers/attendanceSummary.helper", () => ({
  getAttendanceModel: mockModels.getAttendanceModel,
  syncServiceAttendanceSummary: mockModels.syncServiceAttendanceSummary,
}));
jest.mock("../src/helpers/cache.helper", () => mockModels.cache);
jest.mock("../src/helpers/auditLog.helper", () => mockModels.auditLog);
jest.mock("../src/helpers/logger", () => mockModels.logger);
jest.mock("../src/services/notifications.service", () => mockModels.notifications);
jest.mock("../src/helpers/scopedLeader.helper", () => ({
  ensureMemberInScope: mockModels.ensureMemberInScope,
  getMemberScopeWhere: mockModels.getMemberScopeWhere,
}));
jest.mock("../src/modules/qr-attendance/legacyWriteGuard", () => ({
  assertLeaderMayUseLegacyServiceWrite: mockModels.assertLeaderMayUseLegacyServiceWrite,
}));
jest.mock("../src/modules/qr-attendance/reconciliation.service", () => ({
  invalidateServiceFinalization: mockModels.invalidateServiceFinalization,
}));

const attendanceService = require("../src/services/attendance.service");

describe("legacy service attendance archives", () => {
  const user = { userId: 900, roleName: "Registration Team" };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockRecord, {
      id: 55,
      service_id: 21,
      member_id: 155,
      entry_source: "legacy",
      check_in_method: "manual",
      voided_at: null,
      voided_by: null,
      void_reason: null,
    });
    mockModels.getAttendanceModel.mockResolvedValue(mockModels.QrServiceAttendance);
    mockModels.QrServiceAttendance.findByPk.mockResolvedValue(mockRecord);
    mockModels.QrServiceAttendance.findOne.mockResolvedValue(mockRecord);
    mockModels.syncServiceAttendanceSummary.mockResolvedValue(undefined);
    mockModels.invalidateServiceFinalization.mockResolvedValue(undefined);
    mockModels.auditLog.log.mockResolvedValue(undefined);
    mockModels.ensureMemberInScope.mockResolvedValue(undefined);
    mockModels.assertLeaderMayUseLegacyServiceWrite.mockResolvedValue(undefined);
  });

  it("marks an existing legacy check-in voided and syncs totals instead of destroying it", async () => {
    const result = await attendanceService.archiveAttendance(55, user, "Incorrect check-in");

    expect(result.message).toBe("Attendance check-in archived successfully.");
    expect(mockRecord.update).toHaveBeenCalledWith(expect.objectContaining({
      voided_at: expect.any(Date),
      voided_by: user.userId,
      void_reason: "Incorrect check-in",
    }), { transaction: mockTransaction });
    expect(mockRecord.destroy).not.toHaveBeenCalled();
    expect(mockModels.invalidateServiceFinalization).toHaveBeenCalledWith(21, expect.objectContaining({
      transaction: mockTransaction,
      actorId: user.userId,
      reason: "legacy_service_attendance_archived",
    }));
    expect(mockModels.syncServiceAttendanceSummary).toHaveBeenCalledWith(21, mockTransaction);
    expect(mockModels.auditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "ARCHIVE_ATTENDANCE",
      targetTable: "attendances",
      targetId: 55,
    }), { transaction: mockTransaction });
  });

  it("keeps QR-owned and pre-registration check-ins on their audited workflows", async () => {
    mockModels.QrServiceAttendance.findByPk.mockResolvedValueOnce({
      ...mockRecord,
      entry_source: "direct",
    });
    await expect(attendanceService.archiveAttendance(55, user, "Correction"))
      .rejects.toMatchObject({ code: "QR_ATTENDANCE_CORRECTION_REQUIRED" });

    mockModels.QrServiceAttendance.findByPk.mockResolvedValueOnce({
      ...mockRecord,
      entry_source: "legacy",
      check_in_method: "pre-reg",
    });
    await expect(attendanceService.archiveAttendance(55, user, "Correction"))
      .rejects.toMatchObject({ code: "QR_ATTENDANCE_CORRECTION_REQUIRED" });
    expect(mockRecord.destroy).not.toHaveBeenCalled();
  });

  it("refuses to hard-delete if the reversible attendance columns are unavailable", async () => {
    mockModels.getAttendanceModel.mockResolvedValueOnce(mockModels.Attendance);
    await expect(attendanceService.archiveAttendance(55, user, "Correction"))
      .rejects.toMatchObject({ code: "ATTENDANCE_ARCHIVE_SCHEMA_REQUIRED", status: 503 });
    expect(mockModels.QrServiceAttendance.findByPk).not.toHaveBeenCalled();
  });
});
