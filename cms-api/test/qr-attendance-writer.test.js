"use strict";

const mockModels = {
  EventAttendance: { findOne: jest.fn(), create: jest.fn() },
  QrServiceAttendance: { findOne: jest.fn(), create: jest.fn() },
  sequelize: { transaction: jest.fn() },
};
const mockAudit = { writeQrAudit: jest.fn() };

jest.mock("../src/modules/qr-attendance/models", () => mockModels);
jest.mock("../src/modules/qr-attendance/audit", () => mockAudit);
jest.mock("../src/helpers/attendanceSummary.helper", () => ({ syncServiceAttendanceSummary: jest.fn() }));
jest.mock("../src/helpers/cache.helper", () => ({ keys: jest.fn(() => []), del: jest.fn() }));

const { createEventAttendance, createServiceAttendance } = require("../src/modules/qr-attendance/attendanceWriter");

const transaction = { LOCK: { UPDATE: "UPDATE" } };
const serviceSession = { id: 4, service_id: 12, event_id: null };
const eventSession = { id: 8, service_id: null, event_id: 22 };
const member = { id: 30, cell_group_id: 5, group_id: 2 };

describe("QR attendance writers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAudit.writeQrAudit.mockResolvedValue({});
  });

  it("persists a direct Service QR as a QR-sourced barcode record", async () => {
    const checkedInAt = new Date("2026-10-07T02:00:00.000Z");
    const record = { id: 101 };
    mockModels.QrServiceAttendance.findOne.mockResolvedValue(null);
    mockModels.QrServiceAttendance.create.mockResolvedValue(record);

    const result = await createServiceAttendance({
      session: serviceSession,
      member,
      recordedBy: 7,
      confirmedBy: 7,
      method: "qr",
      entrySource: "direct",
      checkedInAt,
      transaction,
    });

    expect(result).toMatchObject({ record, created: true, outcome: "confirmed" });
    expect(mockModels.QrServiceAttendance.create).toHaveBeenCalledWith(expect.objectContaining({
      service_id: 12,
      member_id: 30,
      check_in_method: "barcode",
      checked_in_at: checkedInAt,
      entry_source: "direct",
      confirmed_by: 7,
      cell_group_id_at_check_in: 5,
    }), { transaction });
    expect(mockAudit.writeQrAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "QR_SERVICE_CHECK_IN",
      recordId: 101,
      transaction,
    }));
  });

  it("converts an RSVP row to a real check-in and returns existing check-ins idempotently", async () => {
    const prereg = { id: 102, check_in_method: "pre-reg", update: jest.fn(async () => prereg) };
    mockModels.QrServiceAttendance.findOne.mockResolvedValueOnce(prereg);
    const converted = await createServiceAttendance({
      session: serviceSession, member, recordedBy: 7, confirmedBy: 9,
      method: "manual", entrySource: "leader_batch", checkedInAt: new Date(), transaction,
    });
    expect(converted).toMatchObject({ created: true, outcome: "confirmed" });
    expect(prereg.update).toHaveBeenCalledWith(expect.objectContaining({
      check_in_method: "manual", entry_source: "leader_batch", confirmed_by: 9,
    }), { transaction });

    const existing = { id: 103, check_in_method: "barcode", voided_at: null };
    mockModels.QrServiceAttendance.findOne.mockResolvedValueOnce(existing);
    const duplicate = await createServiceAttendance({
      session: serviceSession, member, recordedBy: 7, method: "qr",
      entrySource: "direct", checkedInAt: new Date(), transaction,
    });
    expect(duplicate).toMatchObject({ record: existing, created: false, outcome: "already_confirmed" });
  });

  it("refuses a voided Service attendance until an audited correction", async () => {
    mockModels.QrServiceAttendance.findOne.mockResolvedValue({ id: 104, voided_at: new Date() });
    await expect(createServiceAttendance({
      session: serviceSession, member, recordedBy: 7, method: "qr",
      entrySource: "direct", checkedInAt: new Date(), transaction,
    })).rejects.toMatchObject({ code: "ATTENDANCE_VOIDED", status: 409 });
  });

  it("persists Event attendance through its session ledger", async () => {
    const record = { id: 201 };
    mockModels.EventAttendance.findOne.mockResolvedValue(null);
    mockModels.EventAttendance.create.mockResolvedValue(record);

    const result = await createEventAttendance({
      session: eventSession, member, recordedBy: 7, confirmedBy: 9,
      method: "qr", entrySource: "leader_batch", batchId: 55,
      checkedInAt: new Date("2026-10-07T02:05:00.000Z"), transaction,
    });

    expect(result).toMatchObject({ record, created: true, outcome: "confirmed" });
    const eventValues = mockModels.EventAttendance.create.mock.calls[0][0];
    expect(eventValues).toEqual(expect.objectContaining({ session_id: 8, member_id: 30, entry_source: "leader_batch", source_batch_id: 55 }));
    expect(eventValues).not.toHaveProperty("event_id");
    expect(mockModels.EventAttendance.create.mock.calls[0][1]).toEqual({ transaction });
    expect(mockAudit.writeQrAudit).toHaveBeenCalledWith(expect.objectContaining({
      action: "QR_EVENT_BATCH_CHECK_IN",
      table: "event_attendances",
      recordId: 201,
      transaction,
    }));
  });
});
