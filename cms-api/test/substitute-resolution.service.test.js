"use strict";

const mockState = { request: null, notifications: jest.fn(), auditLog: jest.fn(), assignmentUpdate: jest.fn() };

jest.mock("../src/config/db", () => ({ transaction: jest.fn(async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } })) }));
jest.mock("../src/models", () => ({
  Attendance: {},
  ServiceAttendanceSummary: {},
  ServiceResponse: {},
  SubstituteRequest: {
    findByPk: jest.fn(async () => mockState.request),
  },
  MinistryAssignment: {
    findByPk: jest.fn(async () => ({ update: (...args) => mockState.assignmentUpdate(...args) })),
  },
  Service: {},
  Member: {},
  User: {},
}));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: (...args) => mockState.auditLog(...args) }));
jest.mock("../src/helpers/attendanceSummary.helper", () => ({ getAttendanceModel: jest.fn(), syncServiceAttendanceSummary: jest.fn() }));
jest.mock("../src/helpers/scopedLeader.helper", () => ({ getMemberScopeWhere: jest.fn() }));
jest.mock("../src/modules/qr-attendance/reconciliation.service", () => ({ invalidateServiceFinalization: jest.fn() }));
jest.mock("../src/services/notifications.service", () => ({ bulkCreateNotifications: (...args) => mockState.notifications(...args) }));

const service = require("../src/services/service-extras.service");

describe("substitute request resolution", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.request = {
      id: 3,
      status: "pending",
      requested_by: 8,
      proposed_substitute: 9,
      proposedSubstituteUser: { member_id: 22 },
      assignment_id: 6,
      assignment: { ministry_role_id: 4 },
      update: jest.fn(async (values) => Object.assign(mockState.request, values)),
    };
    mockState.assignmentUpdate.mockResolvedValue([1]);
    mockState.notifications.mockResolvedValue([]);
  });

  test("retrieves a pending request without running decision logic", async () => {
    await expect(service.getSubstituteRequestById(3, { roleName: "System Admin" })).resolves.toBe(mockState.request);
    expect(mockState.request.update).not.toHaveBeenCalled();
  });

  test("approves atomically, changes the assignee, and notifies both participants", async () => {
    const resolved = await service.resolveSubstituteRequest(3, "approved", 2, { roleName: "System Admin", userId: 2 });

    expect(mockState.assignmentUpdate).toHaveBeenCalledWith({ member_id: 22 }, expect.objectContaining({ transaction: expect.any(Object) }));
    expect(mockState.request.update).toHaveBeenCalledWith({ status: "approved", resolved_by: 2 }, expect.objectContaining({ transaction: expect.any(Object) }));
    expect(mockState.auditLog).toHaveBeenCalledWith(expect.objectContaining({ action: "RESOLVE_SUBSTITUTE_APPROVED" }), expect.any(Object));
    expect(mockState.notifications).toHaveBeenCalledWith([8, 9], expect.objectContaining({ type: "substitute_request_approved", reference_id: 3 }));
    expect(resolved.status).toBe("approved");
  });
});
