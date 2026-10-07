"use strict";

const mockMemberFindOne = jest.fn();
const mockMinistryMembershipFindAll = jest.fn();

jest.mock("../src/models", () => ({
  Member: { findOne: mockMemberFindOne },
  MinistryMembership: { findAll: mockMinistryMembershipFindAll },
}));

const { Op } = require("sequelize");
const {
  applyMemberScope,
  ensureMemberInScope,
  getMemberScopeWhere,
  getScope,
  isScopedLeader,
  requireLeaderScope,
} = require("../src/helpers/scopedLeader.helper");

const captureError = (callback) => {
  try {
    callback();
  } catch (error) {
    return error;
  }
  throw new Error("Expected the operation to be rejected");
};

describe("unified Leader assignment scope", () => {
  const cellAssignment = {
    id: 11, scope_type: "cell_group", scope_id: 7, is_active: 1, version: 1,
  };
  const groupAssignment = {
    id: 12, scope_type: "member_group", scope_id: 7, is_active: 1, version: 1,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("reuses a single verified cell-group assignment when no context header is needed", async () => {
    const user = { roleName: "Leader", leaderAssignmentsLoaded: true, leaderAssignments: [cellAssignment] };
    expect(getScope(user)).toMatchObject({ type: "cell_group", id: 7 });
    expect(await getMemberScopeWhere(user)).toEqual({ cell_group_id: 7 });
    expect(requireLeaderScope(user)).toMatchObject({ type: "cell_group", id: 7 });
  });

  it("maps the existing member_group enum to the group member scope", async () => {
    const user = { roleName: "Leader", leaderAssignmentsLoaded: true, leaderAssignments: [groupAssignment] };
    expect(getScope(user)).toMatchObject({ type: "group", id: 7 });
    expect(await getMemberScopeWhere(user)).toEqual({ group_id: 7 });
  });

  it("uses a deduplicated typed union for a dual leader read and requires a context to write", async () => {
    const user = {
      roleName: "Leader",
      leaderAssignmentsLoaded: true,
      leaderAssignments: [cellAssignment, groupAssignment],
    };
    const scope = await getMemberScopeWhere(user);
    expect(getScope(user)).toMatchObject({ type: "all" });
    expect(scope[Op.or]).toEqual([{ cell_group_id: 7 }, { group_id: 7 }]);
    expect(captureError(() => requireLeaderScope(user))).toMatchObject({
      code: "LEADER_SCOPE_REQUIRED",
      status: 409,
    });
  });

  it("accepts only a team present in the actor's current assignment rows", () => {
    const user = {
      roleName: "Leader",
      leaderAssignmentsLoaded: true,
      leaderAssignments: [cellAssignment, groupAssignment],
    };
    expect(getScope(user, "cell_group:7")).toMatchObject({ type: "cell_group", id: 7 });
    expect(getScope(user, "group:7")).toMatchObject({ type: "group", id: 7 });
    expect(getScope(user, "cell_group:8").type).toBe("invalid");
    expect(getScope(user, "unknown:7").type).toBe("invalid");
  });

  it("never revives a revoked assignment as a global scope", async () => {
    const user = {
      roleName: "Leader",
      leaderAssignmentsLoaded: true,
      leaderAssignments: [{ ...cellAssignment, is_active: 0, revoked_at: new Date() }],
    };
    expect(getScope(user).type).toBe("none");
    expect(await getMemberScopeWhere(user)).toEqual({ id: { [Op.in]: [] } });
  });

  it("requires the middleware to have loaded current assignments before authorizing Leader scope", async () => {
    const user = { roleName: "Leader" };
    expect(getScope(user).type).toBe("unavailable");
    expect(captureError(() => requireLeaderScope(user))).toMatchObject({
      code: "LEADER_ASSIGNMENTS_UNAVAILABLE",
      status: 409,
    });
    expect(await getMemberScopeWhere(user)).toEqual({ id: { [Op.in]: [] } });
  });

  it("keeps scope restrictions separate from a member-search OR", async () => {
    const where = { [Op.or]: [{ first_name: "A" }, { last_name: "A" }] };
    await applyMemberScope(where, {
      roleName: "Leader",
      leaderAssignmentsLoaded: true,
      leaderAssignments: [cellAssignment, groupAssignment],
    });
    expect(where[Op.and]).toHaveLength(2);
    expect(where[Op.and][0][Op.or]).toHaveLength(2);
    expect(where[Op.and][1][Op.or]).toEqual([{ cell_group_id: 7 }, { group_id: 7 }]);
  });

  it("keeps a legacy Cell Group Leader bound to the legacy assigned scope", async () => {
    const user = { roleName: "Cell Group Leader", leadsCellGroupId: 9 };
    expect(isScopedLeader(user)).toBe(true);
    expect(getScope(user)).toMatchObject({ type: "cell_group", id: 9 });
    expect(await getMemberScopeWhere(user)).toEqual({ cell_group_id: 9 });
  });

  it("allows an existing global Pastor reader without converting their role", async () => {
    expect(isScopedLeader({ roleName: "Pastor" })).toBe(false);
    expect(await getMemberScopeWhere({ roleName: "Pastor" })).toBeNull();
  });

  it("does not infer scope from stray legacy fields on an unrelated custom role", async () => {
    const user = { roleName: "Custom Auditor", leadsCellGroupId: 9, leadsGroupId: 4 };
    expect(isScopedLeader(user)).toBe(false);
    expect(getScope(user)).toBeNull();
    expect(await getMemberScopeWhere(user)).toEqual({ id: { [Op.in]: [] } });
  });

  it("blocks a member outside all assigned scopes without loading another profile", async () => {
    mockMemberFindOne.mockResolvedValue(null);
    const user = {
      roleName: "Leader",
      leaderAssignmentsLoaded: true,
      leaderAssignments: [cellAssignment, groupAssignment],
    };
    await expect(ensureMemberInScope(99, user)).rejects.toMatchObject({
      code: "FORBIDDEN",
      status: 403,
    });
    const query = mockMemberFindOne.mock.calls[0][0];
    expect(query.where[Op.and][0]).toEqual({ id: 99 });
    expect(query.where[Op.and][1][Op.or]).toEqual([{ cell_group_id: 7 }, { group_id: 7 }]);
  });
});
