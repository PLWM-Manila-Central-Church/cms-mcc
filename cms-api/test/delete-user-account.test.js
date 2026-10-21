"use strict";

const mockState = {};
jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => callback(mockState.transaction)),
  literal: jest.fn((value) => value),
}));
jest.mock("../src/models", () => ({
  User: { findOne: jest.fn(async () => mockState.user) },
  RefreshToken: { update: jest.fn(async () => [1]) },
  PasswordResetToken: { update: jest.fn(async () => [1]) },
  UserSession: { update: jest.fn(async () => [1]) },
  UserLeaderAssignment: { update: jest.fn(async () => [1]) },
  AuditLog: { create: jest.fn(async () => ({})) },
  Member: { update: jest.fn(), destroy: jest.fn() },
  MinistryMembership: { destroy: jest.fn() },
}));
const models = require("../src/models");
const remove = require("../src/services/delete-user-account.service");
beforeEach(() => {
  jest.clearAllMocks();
  mockState.transaction = { LOCK: { UPDATE: "UPDATE" } };
  mockState.user = { id: 42, email: "pastor@plwmmcc.com", member_id: 9, leadership_revision: 2, update: jest.fn(async () => {}) };
});
test("removing an account preserves its Member and business history while revoking credentials", async () => {
  await remove(42, { userId: 1, roleName: "System Admin" });
  expect(models.Member.update).not.toHaveBeenCalled();
  expect(models.Member.destroy).not.toHaveBeenCalled();
  expect(models.MinistryMembership.destroy).not.toHaveBeenCalled();
  expect(models.RefreshToken.update).toHaveBeenCalledWith(expect.objectContaining({ revoked: 1 }), expect.objectContaining({ transaction: mockState.transaction }));
  expect(models.UserSession.update).toHaveBeenCalledWith(expect.objectContaining({ logout_at: expect.any(Date) }), expect.anything());
  expect(mockState.user.update).toHaveBeenCalledWith(expect.objectContaining({ archived_email: "pastor@plwmmcc.com", is_deleted: 1, is_active: 0 }), { transaction: mockState.transaction });
  expect(mockState.user.member_id).toBe(9);
  expect(models.AuditLog.create).toHaveBeenCalledWith(expect.objectContaining({ old_values: { email: "pastor@plwmmcc.com", member_id: 9 } }), expect.anything());
});
test("rejects deleting the current admin before writes", async () => {
  await expect(remove(1, { userId: 1, roleName: "System Admin" })).rejects.toMatchObject({ status: 400 });
  expect(models.User.findOne).not.toHaveBeenCalled();
});
test("rejects registration privilege escalation before writes", async () => {
  await expect(remove(42, { userId: 2, roleName: "Registration Team" })).rejects.toMatchObject({ status: 403 });
  expect(models.User.findOne).not.toHaveBeenCalled();
});
