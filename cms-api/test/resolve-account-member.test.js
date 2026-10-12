"use strict";
jest.mock("../src/models", () => ({ Member: { findOne: jest.fn(), create: jest.fn() }, User: { findOne: jest.fn() } }));
const { Member, User } = require("../src/models");
const resolve = require("../src/helpers/resolveAccountMember");
beforeEach(() => { jest.resetAllMocks(); User.findOne.mockResolvedValue(null); });
test("requests explicit linking instead of creating a duplicate Member", async () => {
  Member.findOne.mockResolvedValue({ id: 42, first_name: "Existing", last_name: "Member", is_deleted: 0 });
  await expect(resolve({ email: "pastor@plwmmcc.com" })).rejects.toMatchObject({ status: 409, code: "MEMBER_PROFILE_EXISTS", details: { member: { id: 42 } } });
  expect(Member.create).not.toHaveBeenCalled();
});
test("links an existing Member after account removal without changing their profile", async () => {
  Member.findOne.mockResolvedValue({ id: 42 });
  expect(await resolve({ member_id: 42, first_name: "Do not overwrite" })).toBe(42);
  expect(Member.create).not.toHaveBeenCalled();
});
test("rejects duplicate logins linked to the same Member", async () => {
  Member.findOne.mockResolvedValue({ id: 42 }); User.findOne.mockResolvedValue({ id: 9 });
  await expect(resolve({ member_id: 42 })).rejects.toMatchObject({ code: "MEMBER_LOGIN_EXISTS", status: 409 });
});
test("does not create over an archived Member's unique email", async () => {
  Member.findOne.mockResolvedValue({ id: 42, is_deleted: 1 });
  await expect(resolve({ email: "old@example.com" })).rejects.toMatchObject({ code: "MEMBER_ARCHIVED" });
  expect(Member.create).not.toHaveBeenCalled();
});
