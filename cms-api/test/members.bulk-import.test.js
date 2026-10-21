"use strict";

jest.mock("../src/helpers/cache.helper", () => ({ keys: jest.fn(() => []), del: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ info: jest.fn(), error: jest.fn(), warn: jest.fn() }));

const membersService = require("../src/services/members.service");
const { CellGroup, MinistryGroup, Member } = require("../src/models");

describe("bulk member roster import mapping", () => {
  afterEach(() => jest.restoreAllMocks());

  test("preserves single names and profile fields while normalizing legacy states with history", async () => {
    const create = jest.spyOn(membersService, "createMember").mockImplementation(async (data) => ({ id: 700 + data.first_name.length }));
    const admin = { userId: 9, roleName: "System Admin" };
    const csv = [
      "first_name,last_name,phone,birthdate,spiritual_birthday,address,gender,status,source_status,cell_group_id,group_id,profile_photo_url",
      "Cher,,09171234567,2000-03-14,2020-08-09,,Female,Active,New,11,2,/uploads/profiles/cher.jpg",
      "Alex,Sample,09170000000,,,,Male,Active,Semi-Active,11,3,",
      "Jamie,Example,,,,,Female,Inactive,In-Active,12,4,",
      "Taylor,Case,,,,,Female,Active,,12,4,",
    ].join("\n");

    const result = await membersService.bulkCreateMembers(Buffer.from(csv), 9, admin);

    expect(result.created).toBe(4);
    expect(result.skipped).toBe(0);
    expect(create).toHaveBeenNthCalledWith(1, expect.objectContaining({
      first_name: "Cher", last_name: "", phone: "09171234567", birthdate: new Date("2000-03-14T00:00:00.000Z"),
      spiritual_birthday: new Date("2020-08-09T00:00:00.000Z"), gender: "Female", status: "Active",
      profile_photo_url: "/uploads/profiles/cher.jpg",
    }), 9, admin, "New");
    expect(create).toHaveBeenNthCalledWith(2, expect.objectContaining({ status: "Active" }), 9, admin, "Semi-Active");
    expect(create).toHaveBeenNthCalledWith(3, expect.objectContaining({ status: "Inactive" }), 9, admin, null);
    expect(create).toHaveBeenNthCalledWith(4, expect.objectContaining({ status: "Active" }), 9, admin, null);
  });

  test("reports rejected rows without including roster names in errors", async () => {
    const create = jest.spyOn(membersService, "createMember").mockResolvedValue({ id: 1 });
    const result = await membersService.bulkCreateMembers(Buffer.from([
      "first_name,last_name,status",
      "Unknown,Person,Unrecognized State",
    ].join("\n")), 9, { userId: 9, roleName: "System Admin" });

    expect(create).not.toHaveBeenCalled();
    expect(result).toMatchObject({ created: 0, skipped: 1, errors: [{ row: 2, error: "VALIDATION" }] });
    expect(JSON.stringify(result)).not.toContain("Unknown Person");
  });

  test("resolves exact cell-group and main-group names from the roster", async () => {
    const create = jest.spyOn(membersService, "createMember").mockResolvedValue({ id: 702 });
    jest.spyOn(CellGroup, "findAll").mockResolvedValue([{ id: 11 }]);
    jest.spyOn(MinistryGroup, "findAll").mockResolvedValue([{ id: 5 }]);
    const user = { userId: 9, roleName: "System Admin" };

    const result = await membersService.bulkCreateMembers(Buffer.from("\uFEFF" + [
      "first_name,last_name,cell_group_name,group_name,status",
      "Current,Member,Cell Group 11 UPS 5,Elementary,Active",
    ].join("\n")), 9, user);

    expect(result).toMatchObject({ created: 1, skipped: 0 });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      first_name: "Current",
      cell_group_id: 11,
      group_id: 5,
    }), 9, user, null);
  });

  test("skips rows when a group name is not an exact unique match", async () => {
    const create = jest.spyOn(membersService, "createMember").mockResolvedValue({ id: 703 });
    jest.spyOn(CellGroup, "findAll").mockResolvedValue([]);
    const result = await membersService.bulkCreateMembers(Buffer.from([
      "first_name,last_name,cell_group_name",
      "Current,Member,Wrong Group",
    ].join("\n")), 9, { userId: 9, roleName: "System Admin" });

    expect(result).toMatchObject({ created: 0, skipped: 1, errors: [{ row: 2, error: "VALIDATION" }] });
    expect(create).not.toHaveBeenCalled();
  });

  test("adds an ID tiebreaker so same-name members paginate consistently", async () => {
    const find = jest.spyOn(Member, "findAndCountAll").mockResolvedValue({ count: 2, rows: [] });

    await membersService.getAllMembers(
      { page: 2, limit: 20 },
      { userId: 9, roleName: "System Admin" },
    );

    expect(find).toHaveBeenCalledWith(expect.objectContaining({
      order: [["last_name", "ASC"], ["first_name", "ASC"], ["id", "ASC"]],
      limit: 20,
      offset: 20,
    }));
  });
});
