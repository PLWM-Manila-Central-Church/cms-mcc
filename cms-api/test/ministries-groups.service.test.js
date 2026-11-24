"use strict";

jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/models", () => ({
  MinistryGroup: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  MinistryRole: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  MinistryMembership: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findOrCreate: jest.fn(),
    create: jest.fn(),
    unscoped: jest.fn(),
  },
  GroupPosition: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  GroupMemberPosition: {
    findAll: jest.fn(),
    findOrCreate: jest.fn(),
  },
  GroupActivity: {
    findAll: jest.fn(),
    create: jest.fn(),
  },
  GroupTask: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Member: { findAll: jest.fn() },
  User: {},
}));

const models = require("../src/models");
const lifeMinistries = require("../src/services/lifeMinistries.service");
const orgGroups = require("../src/services/orgGroups.service");

describe("Phase 1 — Ministries vs. Organizational Groups services", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    models.MinistryMembership.unscoped.mockReturnValue(models.MinistryMembership);
    models.MinistryMembership.findOne.mockResolvedValue(null);
    models.MinistryMembership.create.mockResolvedValue({ id: 1 });
  });

  test("listMinistries aggregates total/active/inactive counts and respects Group Leader scope", async () => {
    models.MinistryGroup.findAll.mockResolvedValue([
      { toJSON: () => ({ id: 2, name: "Young Adults", code: "YA" }) },
    ]);
    models.Member.findAll
      .mockResolvedValueOnce([{ group_id: 2, cnt: 15 }])
      .mockResolvedValueOnce([{ group_id: 2, cnt: 12 }]);

    const rows = await lifeMinistries.listMinistries({ roleName: "Group Leader", leadsGroupId: 2 });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id: 2, member_count: 15, active_member_count: 12, inactive_member_count: 3 });
  });

  test("getMinistryDetail blocks Group Leader from reading another ministry", async () => {
    await expect(
      lifeMinistries.getMinistryDetail(9, { roleName: "Group Leader", leadsGroupId: 2 })
    ).rejects.toMatchObject({ status: 403 });
  });

  test("assignMemberPosition ensures membership in ministry_memberships (multi-group allowed)", async () => {
    models.MinistryMembership.findOrCreate.mockResolvedValue([{ id: 1 }, true]);
    models.GroupMemberPosition.findOrCreate.mockResolvedValue([{ id: 7, is_active: 1 }, true]);

    const res = await orgGroups.assignMemberPosition(
      4,
      { member_id: 22, position_id: 3 },
      { userId: 1, roleName: "System Admin" }
    );
    expect(models.MinistryMembership.create).toHaveBeenCalledWith({
      ministry_role_id: 4,
      member_id: 22,
      added_by: 1,
    });
    expect(res.id).toBe(7);
  });

  test("updateTaskStatus validates allowed status and sets completed_at when completed", async () => {
    const update = jest.fn();
    models.GroupTask.findOne.mockResolvedValue({ id: 10, update });

    await orgGroups.updateTaskStatus(4, 10, "completed", { userId: 1, roleName: "System Admin" });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ status: "completed", completed_at: expect.any(Date) }));

    await expect(
      orgGroups.updateTaskStatus(4, 10, "bogus", { userId: 1, roleName: "System Admin" })
    ).rejects.toMatchObject({ status: 400 });
  });
});
