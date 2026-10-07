jest.mock("../src/helpers/permissionCache.helper", () => ({
  get: jest.fn(),
}));
jest.mock("../src/services/leader-access.service", () => ({
  getLeaderProfilePermissions: jest.fn(),
}));

const permissionCache = require("../src/helpers/permissionCache.helper");
const { getLeaderProfilePermissions } = require("../src/services/leader-access.service");
const authorize = require("../src/middlewares/authorize");

const createResponse = () => {
  const res = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
  };
  return res;
};

describe("authorize middleware", () => {
  beforeEach(() => jest.clearAllMocks());

  it("denies a Member when the role lacks the requested module permission", async () => {
    permissionCache.get.mockResolvedValue(new Set(["events:read"]));
    const req = { user: { userId: 14, roleId: 7, roleName: "Member" } };
    const res = createResponse();
    const next = jest.fn();

    await authorize("finance", "read")(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ message: "Access forbidden" });
    expect(next).not.toHaveBeenCalled();
  });

  it("allows a role that has the exact requested permission", async () => {
    permissionCache.get.mockResolvedValue(new Set(["dashboard:read"]));
    const req = { user: { userId: 14, roleId: 4, roleName: "Finance Team" } };
    const res = createResponse();
    const next = jest.fn();

    await authorize("dashboard", "read")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it("keeps the System Admin permission bypass", async () => {
    const req = { user: { userId: 1, roleId: 1, roleName: "System Admin" } };
    const res = createResponse();
    const next = jest.fn();

    await authorize("dashboard", "read")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(permissionCache.get).not.toHaveBeenCalled();
  });

  it("allows combined Leader reads only through assigned permission profiles", async () => {
    getLeaderProfilePermissions.mockResolvedValue(new Set(["qr_attendance:read"]));
    const req = {
      user: {
        userId: 25,
        roleId: 99,
        roleName: "Leader",
        leaderScopeKey: "all",
        leaderAssignmentsLoaded: true,
        leaderAssignments: [
          { id: 4, scope_type: "cell_group", scope_id: 8, is_active: true },
          { id: 5, scope_type: "member_group", scope_id: 3, is_active: true },
        ],
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await authorize("qr_attendance", "read")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(getLeaderProfilePermissions).toHaveBeenCalledWith(req.user);
  });

  it("requires one selected Leader team before write actions", async () => {
    const req = {
      user: {
        userId: 25,
        roleId: 99,
        roleName: "Leader",
        leaderScopeKey: "all",
        leaderAssignmentsLoaded: true,
        leaderAssignments: [
          { id: 4, scope_type: "cell_group", scope_id: 8, is_active: true },
          { id: 5, scope_type: "member_group", scope_id: 3, is_active: true },
        ],
      },
    };
    const res = createResponse();
    const next = jest.fn();

    await authorize("qr_attendance", "record_batch")(req, res, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next.mock.calls[0][0]).toMatchObject({ code: "LEADER_SCOPE_REQUIRED", status: 409 });
    expect(getLeaderProfilePermissions).not.toHaveBeenCalled();
  });
});
