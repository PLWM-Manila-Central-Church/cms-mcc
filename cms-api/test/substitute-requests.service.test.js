"use strict";

const mockState = {
  requester: null,
  assignment: null,
  pendingRequest: null,
  proposedUser: null,
  createdRequest: null,
  eligibleAssignments: [],
  pendingAssignments: [],
  replacementRoster: [],
};

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => callback({ LOCK: { UPDATE: "UPDATE" } })),
}));
jest.mock("../src/models", () => ({
  Attendance: {},
  ServiceAttendanceSummary: {},
  ServiceResponse: {},
  SubstituteRequest: {
    findAll: jest.fn(async () => mockState.pendingAssignments),
    findOne: jest.fn(async () => mockState.pendingRequest),
    findByPk: jest.fn(async () => mockState.createdRequest),
    create: jest.fn(async () => mockState.createdRequest),
  },
  MinistryAssignment: {
    findAll: jest.fn(async () => mockState.eligibleAssignments),
    findOne: jest.fn(async () => mockState.assignment),
  },
  MinistryMembership: {
    findAll: jest.fn(async () => mockState.replacementRoster),
    findOne: jest.fn(async () => ({ id: 71 })),
  },
  Service: {},
  Member: {},
  User: {
    findByPk: jest.fn(async () => mockState.requester),
    findOne: jest.fn(async () => mockState.proposedUser),
  },
}));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn(async () => undefined) }));
jest.mock("../src/helpers/attendanceSummary.helper", () => ({
  getAttendanceModel: jest.fn(),
  syncServiceAttendanceSummary: jest.fn(),
}));
jest.mock("../src/helpers/scopedLeader.helper", () => ({ getMemberScopeWhere: jest.fn() }));
jest.mock("../src/modules/qr-attendance/reconciliation.service", () => ({ invalidateServiceFinalization: jest.fn() }));
jest.mock("../src/services/notifications.service", () => ({ bulkCreateNotifications: jest.fn() }));

const {
  SubstituteRequest,
  MinistryAssignment,
  MinistryMembership,
  User,
} = require("../src/models");
const auditLog = require("../src/helpers/auditLog.helper");
const service = require("../src/services/service-extras.service");

describe("substitute request creation and visibility", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.requester = { id: 17, member_id: 101, is_active: 1, is_deleted: 0 };
    mockState.assignment = {
      id: 31,
      service_id: 8,
      ministry_role_id: 4,
      Service: { id: 8, status: "published" },
      update: jest.fn(async () => undefined),
    };
    mockState.pendingRequest = null;
    mockState.proposedUser = { id: 29, member_id: 202 };
    mockState.createdRequest = {
      id: 44,
      status: "pending",
      assignment_id: 31,
      requested_by: 17,
      proposed_substitute: 29,
    };
    mockState.eligibleAssignments = [];
    mockState.pendingAssignments = [];
    mockState.replacementRoster = [];
  });

  it("creates only for the caller's assigned published service and maps a roster Member to their User", async () => {
    const result = await service.createSubstituteRequest({
      service_id: "8",
      reason: "I cannot attend this service.",
      proposed_member_id: "202",
    }, 17);

    expect(result).toBe(mockState.createdRequest);
    expect(MinistryAssignment.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { service_id: 8, member_id: 101 },
    }));
    expect(MinistryMembership.findOne).toHaveBeenCalledWith(expect.objectContaining({
      where: { ministry_role_id: 4, member_id: 202 },
    }));
    expect(SubstituteRequest.create).toHaveBeenCalledWith({
      assignment_id: 31,
      requested_by: 17,
      proposed_substitute: 29,
      reason: "I cannot attend this service.",
      status: "pending",
    }, expect.objectContaining({ transaction: expect.any(Object) }));
    expect(mockState.assignment.update).toHaveBeenCalledWith({ substitute_requested: 1 }, expect.any(Object));
    expect(auditLog.log).toHaveBeenCalledWith(expect.objectContaining({
      action: "CREATE_SUBSTITUTE_REQUEST",
      targetTable: "substitute_requests",
      targetId: 44,
    }), expect.any(Object));
  });

  it("rejects a service that is not assigned to the requesting Member", async () => {
    mockState.assignment = null;

    await expect(service.createSubstituteRequest({ service_id: 8, reason: "Need a substitute for this service." }, 17))
      .rejects.toMatchObject({ status: 403 });
    expect(SubstituteRequest.create).not.toHaveBeenCalled();
  });

  it("prevents a second pending request for the same assignment", async () => {
    mockState.pendingRequest = { id: 40, status: "pending" };

    await expect(service.createSubstituteRequest({ service_id: 8, reason: "Need a substitute for this service." }, 17))
      .rejects.toMatchObject({ status: 409, code: "SUBSTITUTE_REQUEST_PENDING" });
    expect(SubstituteRequest.create).not.toHaveBeenCalled();
  });

  it("requires a proposed replacement to have an active account and be rostered in the same ministry", async () => {
    mockState.proposedUser = null;
    await expect(service.createSubstituteRequest({
      service_id: 8,
      reason: "Need a substitute for this service.",
      proposed_member_id: 202,
    }, 17)).rejects.toMatchObject({ status: 400 });

    mockState.proposedUser = { id: 29, member_id: 202 };
    MinistryMembership.findOne.mockResolvedValueOnce(null);
    await expect(service.createSubstituteRequest({
      service_id: 8,
      reason: "Need a substitute for this service.",
      proposed_member_id: 202,
    }, 17)).rejects.toMatchObject({ status: 400 });
    expect(SubstituteRequest.create).not.toHaveBeenCalled();
  });

  it("lists only the caller's eligible published services and rostered, active replacement accounts", async () => {
    const eligible = { id: 8, service_date: "2026-10-12", service_time: "10:00", title: "Published service" };
    const pendingService = { id: 9, service_date: "2026-10-11", service_time: "10:00", title: "Has pending request" };
    mockState.eligibleAssignments = [
      { id: 31, Service: eligible },
      { id: 32, Service: pendingService },
    ];
    mockState.pendingAssignments = [{ assignment_id: 32 }];
    mockState.assignment = { id: 31, ministry_role_id: 4 };
    mockState.replacementRoster = [
      { member: { id: 202, first_name: "Second", last_name: "Member" } },
    ];

    await expect(service.getEligibleSubstituteServices(17)).resolves.toEqual([eligible]);
    await expect(service.getEligibleSubstituteReplacements(8, 17, "Member")).resolves.toEqual([
      { id: 202, first_name: "Second", last_name: "Member" },
    ]);
    expect(MinistryMembership.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ ministry_role_id: 4 }),
    }));
  });
});
