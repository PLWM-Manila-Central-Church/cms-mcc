"use strict";

jest.mock("../src/services/members.service", () => ({ updateMemberProfilePhoto: jest.fn() }));
jest.mock("../src/middlewares/upload-s3", () => ({ getFileUrl: jest.fn((key) => `/uploads/${key}`), deleteStoredFile: jest.fn() }));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn() }));

const membersService = require("../src/services/members.service");
const storage = require("../src/middlewares/upload-s3");
const controller = require("../src/controllers/members.controller");

test("links a profile upload to the requested member", async () => {
  const req = { params: { id: "42" }, file: { key: "profiles/member.jpg", filename: undefined }, user: { userId: 7, roleName: "System Admin" } };
  const res = { json: jest.fn() };
  const next = jest.fn();
  membersService.updateMemberProfilePhoto.mockResolvedValue({ id: 42, profile_photo_url: "/uploads/profiles/member.jpg" });

  await controller.uploadMemberPhoto(req, res, next);

  expect(membersService.updateMemberProfilePhoto).toHaveBeenCalledWith( "42", "/uploads/profiles/member.jpg", 7, req.user);
  expect(res.json).toHaveBeenCalledWith({ success: true, data: { id: 42, profile_photo_url: "/uploads/profiles/member.jpg" } });
  expect(next).not.toHaveBeenCalled();
});

test("removes an uploaded object when the member update fails", async () => {
  const req = { params: { id: "42" }, file: { key: "profiles/orphan.jpg" }, user: { userId: 7, roleName: "System Admin" } };
  const res = { json: jest.fn() };
  const next = jest.fn();
  membersService.updateMemberProfilePhoto.mockRejectedValue(new Error("Member not found"));

  await controller.uploadMemberPhoto(req, res, next);

  expect(storage.deleteStoredFile).toHaveBeenCalledWith("profiles/orphan.jpg");
  expect(next).toHaveBeenCalledWith(expect.objectContaining({ message: "Member not found" }));
});
