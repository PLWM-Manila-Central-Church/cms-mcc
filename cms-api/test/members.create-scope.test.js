"use strict";

jest.mock("../src/helpers/cache.helper", () => ({ keys: jest.fn(() => []), del: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

const { CellGroup, Member, MemberStatusHistory } = require("../src/models");
const membersService = require("../src/services/members.service");

describe("member creation scope", () => {
  afterEach(() => jest.restoreAllMocks());

  test("rejects out-of-scope cell-group creation before inserting a member", async () => {
    const create = jest.spyOn(Member, "create");
    const user = { userId: 9, roleName: "Cell Group Leader", leadsCellGroupId: 123 };

    await expect(membersService.createMember({
      first_name: "Scope",
      last_name: "Check",
      cell_group_id: 456,
    }, 9, user)).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(create).not.toHaveBeenCalled();
  });

  test("keeps a valid cell-group leader creation in the assigned team", async () => {
    jest.spyOn(CellGroup, "findByPk").mockResolvedValue({ id: 123 });
    const create = jest.spyOn(Member, "create").mockResolvedValue({ id: 42, status: "Active" });
    jest.spyOn(membersService, "getMemberById").mockResolvedValue({ id: 42, status: "Active" });
    const user = { userId: 9, roleName: "Cell Group Leader", leadsCellGroupId: 123 };

    await membersService.createMember({
      first_name: "Scope",
      last_name: "Check",
      cell_group_id: 123,
      group_id: 456,
    }, 9, user);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ cell_group_id: 123, group_id: null }));
    expect(membersService.getMemberById).toHaveBeenCalledWith(42, user);
  });

  test("rejects a unified leader's read-only all-teams context before inserting", async () => {
    const create = jest.spyOn(Member, "create");
    const user = {
      userId: 9,
      roleName: "Leader",
      leaderScopeKey: "all",
      leaderAssignmentsLoaded: true,
      leaderAssignments: [
        { id: 1, scope_type: "cell_group", scope_id: 123, is_active: 1 },
        { id: 2, scope_type: "group", scope_id: 456, is_active: 1 },
      ],
    };

    await expect(membersService.createMember({
      first_name: "Scope",
      last_name: "Check",
      cell_group_id: 123,
    }, 9, user)).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(create).not.toHaveBeenCalled();
  });

  test("rolls back a newly inserted member if the scoped profile read fails", async () => {
    jest.spyOn(Member, "create").mockResolvedValue({ id: 901, status: "Active" });
    const destroy = jest.spyOn(Member, "destroy").mockResolvedValue(1);
    const destroyHistory = jest.spyOn(MemberStatusHistory, "destroy").mockResolvedValue(1);
    jest.spyOn(MemberStatusHistory, "create").mockResolvedValue({ id: 1 });
    jest.spyOn(membersService, "getMemberById").mockRejectedValue({ code: "FORBIDDEN" });

    await expect(membersService.createMember({
      first_name: "Atomic",
      last_name: "QA",
      status: "Active",
    }, 9, { userId: 9, roleName: "System Admin" }, "New")).rejects.toMatchObject({ code: "FORBIDDEN" });

    expect(destroyHistory).toHaveBeenCalledWith({ where: { member_id: 901 } });
    expect(destroy).toHaveBeenCalledWith({ where: { id: 901 }, force: true });
  });
});
