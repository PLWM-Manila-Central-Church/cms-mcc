"use strict";

jest.mock("../src/config/db", () => ({
  query: jest.fn(async () => []),
  QueryTypes: { SELECT: "SELECT" },
  transaction: jest.fn(),
}));
jest.mock("../src/models", () => {
  const model = {};
  return Object.fromEntries([
    "User", "Member", "Event", "Service", "Attendance", "FinancialRecord", "Fund", "Account",
    "ExpenseCategory", "Expense", "PaymentMethod", "CellGroup",
    "InventoryItem", "MinistryRole", "ArchiveCategory", "Attachment", "Notification",
    "EmergencyContact", "MinistryAssignment", "MinistryMembership", "EventImageArchive",
  ].map((name) => [name, model]));
});
jest.mock("../src/modules/qr-attendance/models", () => ({ AttendanceBatchItem: {} }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/cache.helper", () => ({ keys: jest.fn(() => []), del: jest.fn() }));
jest.mock("../src/helpers/attendanceSummary.helper", () => ({ getAttendanceModel: jest.fn(), syncServiceAttendanceSummary: jest.fn() }));
jest.mock("../src/modules/qr-attendance/reconciliation.service", () => ({ invalidateServiceFinalization: jest.fn() }));

const service = require("../src/services/system-archives.service");

describe("System Archives record types", () => {
  test("exposes archive and restore options for retained workflow records", async () => {
    const result = await service.getArchivedSystemRecords();
    const values = new Set(result.types.map((type) => type.value));
    for (const expected of [
      "notifications", "emergency_contacts", "ministry_assignments",
      "ministry_memberships", "attendance_batch_items", "event_images",
      "funds", "accounts", "expense_categories", "expenses",
    ]) expect(values.has(expected)).toBe(true);
  });
});
