"use strict";

jest.mock("../src/modules/qr-attendance/featureSettings", () => ({
  isQrAttendanceEnabled: jest.fn(),
}));
jest.mock("../src/modules/qr-attendance/models", () => ({
  QrAttendanceSession: { findOne: jest.fn() },
}));

const { isQrAttendanceEnabled } = require("../src/modules/qr-attendance/featureSettings");
const { QrAttendanceSession } = require("../src/modules/qr-attendance/models");
const { assertLeaderMayUseLegacyServiceWrite } = require("../src/modules/qr-attendance/legacyWriteGuard");
const validators = require("../src/modules/qr-attendance/validators");

describe("QR attendance write policy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isQrAttendanceEnabled.mockResolvedValue(true);
    QrAttendanceSession.findOne.mockResolvedValue({ leader_confirmation_mode: "batch_review" });
  });

  it("requires every legacy service check-in to use the QR workspace after a batch session is configured", async () => {
    await expect(assertLeaderMayUseLegacyServiceWrite(12, { roleName: "Registration Team" }))
      .rejects.toMatchObject({ code: "QR_ATTENDANCE_WORKSPACE_REQUIRED", status: 409 });
  });

  it("keeps leaders on the approved batch path for legacy edits and removals", async () => {
    await expect(assertLeaderMayUseLegacyServiceWrite(12, { roleName: "Cell Group Leader" }, { action: "delete" }))
      .rejects.toMatchObject({ code: "BATCH_APPROVAL_REQUIRED", status: 409 });
  });

  it("allows authorized staff to undo a legacy record without changing the QR flow", async () => {
    await expect(assertLeaderMayUseLegacyServiceWrite(12, { roleName: "Registration Team" }, { action: "delete" }))
      .resolves.toBeUndefined();
  });

  it("allows trusted QR writes and approved batches through the legacy compatibility service", async () => {
    await expect(assertLeaderMayUseLegacyServiceWrite(12, {}, { qrSessionWrite: true })).resolves.toBeUndefined();
    await expect(assertLeaderMayUseLegacyServiceWrite(12, {}, { approvedBatch: true })).resolves.toBeUndefined();
    expect(QrAttendanceSession.findOne).not.toHaveBeenCalled();
  });

  it("leaves all legacy writes unchanged while the global QR switch is off", async () => {
    isQrAttendanceEnabled.mockResolvedValue(false);
    await expect(assertLeaderMayUseLegacyServiceWrite(12, { roleName: "Registration Team" })).resolves.toBeUndefined();
    expect(QrAttendanceSession.findOne).not.toHaveBeenCalled();
  });
});

describe("QR attendance request validation", () => {
  const validSession = {
    target_type: "event",
    target_id: 2,
    session_key: "morning",
    title: "Morning Gathering",
    starts_at: "2026-10-07T02:00:00.000Z",
    ends_at: "2026-10-07T04:00:00.000Z",
    check_in_opens_at: "2026-10-07T01:30:00.000Z",
    check_in_closes_at: "2026-10-07T04:00:00.000Z",
    approval_deadline: "2026-10-08T04:00:00.000Z",
  };

  it("accepts an event registration roster only when registration is required", () => {
    const result = validators.createSessionSchema.validate({
      ...validSession,
      expected_basis: "registrations",
      registration_required: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.value.leader_confirmation_mode).toBe("batch_review");
  });

  it("rejects a registration roster without a required-registration rule", () => {
    const result = validators.createSessionSchema.validate({
      ...validSession,
      expected_basis: "registrations",
      registration_required: false,
    });
    expect(result.error).toBeDefined();
  });

  it("requires exactly one direct-check-in identity source", () => {
    expect(validators.directCheckInSchema.validate({}).error).toBeDefined();
    expect(validators.directCheckInSchema.validate({ member_id: 4, qr_payload: "x" }).error).toBeDefined();
    expect(validators.directCheckInSchema.validate({ qr_payload: "MCC:MEMBER:1:123" }).error).toBeUndefined();
    expect(validators.directCheckInSchema.validate({ member_id: 4 }).error).toBeUndefined();
  });

  it("requires a recorded reason before late batch approval", () => {
    const base = { expected_revision: 2, content_digest: "a".repeat(64), late_approval: true };
    expect(validators.approveBatchSchema.validate(base).error).toBeDefined();
    expect(validators.approveBatchSchema.validate({ ...base, late_approval_reason: "Reviewed after the event" }).error).toBeUndefined();
  });

  it("keeps the submitted-batch state filter after validated query normalization", () => {
    const result = validators.batchListQuerySchema.validate({ state: "submitted", page: "2", limit: "25" }, { stripUnknown: true, convert: true });
    expect(result.error).toBeUndefined();
    expect(result.value).toMatchObject({ state: "submitted", page: 2, limit: 25 });
    expect(result.value.status).toBeUndefined();
  });

  it("normalizes the early status spelling but rejects conflicting filters", () => {
    const legacy = validators.batchListQuerySchema.validate({ status: "approved" }, { stripUnknown: true, convert: true });
    expect(legacy.error).toBeUndefined();
    expect(legacy.value.state).toBe("approved");
    expect(validators.batchListQuerySchema.validate({ state: "submitted", status: "rejected" }).error).toBeDefined();
    expect(validators.batchListQuerySchema.validate({ state: "open" }).error).toBeDefined();
  });
});
