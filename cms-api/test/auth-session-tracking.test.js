"use strict";

const crypto = require("node:crypto");

const mockState = {};

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => callback(mockState.transaction)),
}));
jest.mock("../src/models", () => ({
  User: {}, Role: {}, Member: {}, PasswordResetToken: {},
  RefreshToken: {
    findOne: jest.fn(async () => mockState.refreshToken),
    update: jest.fn(async () => [1]),
  },
  UserSession: { update: jest.fn(async () => [1]) },
  RolePermission: {}, Permission: {}, MinistryRole: {}, CellGroup: {}, MinistryGroup: {}, UserLeaderAssignment: {},
}));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/utils/mailer", () => ({ sendPasswordReset: jest.fn() }));

const { RefreshToken, UserSession } = require("../src/models");
const authService = require("../src/services/auth.service");

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

describe("auth session audit tracking", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState.transaction = { LOCK: { UPDATE: "UPDATE" } };
    mockState.refreshToken = { user_session_id: 41 };
  });

  it("closes only the session bound to the signed-in browser context", async () => {
    const rawToken = "qa-refresh-token";
    const now = expect.any(Date);

    await authService.logout(7, rawToken, 41);

    expect(RefreshToken.update).toHaveBeenNthCalledWith(1,
      { revoked: 1, revoked_at: now },
      { where: { user_id: 7, token: hashToken(rawToken), revoked: 0 }, transaction: mockState.transaction },
    );
    expect(RefreshToken.update).toHaveBeenNthCalledWith(2,
      { revoked: 1, revoked_at: now },
      { where: { user_id: 7, user_session_id: 41, revoked: 0 }, transaction: mockState.transaction },
    );
    expect(UserSession.update).toHaveBeenCalledWith(
      { logout_at: now },
      { where: { id: 41, user_id: 7, logout_at: null }, transaction: mockState.transaction },
    );
  });

  it("uses the signed access-token session id when the refresh cookie is absent", async () => {
    await authService.logout(7, null, 42);

    expect(RefreshToken.findOne).not.toHaveBeenCalled();
    expect(RefreshToken.update).toHaveBeenCalledWith(
      { revoked: 1, revoked_at: expect.any(Date) },
      { where: { user_id: 7, user_session_id: 42, revoked: 0 }, transaction: mockState.transaction },
    );
    expect(UserSession.update).toHaveBeenCalledWith(
      { logout_at: expect.any(Date) },
      { where: { id: 42, user_id: 7, logout_at: null }, transaction: mockState.transaction },
    );
  });

  it("keeps legacy unlinked refresh tokens revocable without guessing a session", async () => {
    const rawToken = "legacy-qa-refresh-token";
    mockState.refreshToken = { user_session_id: null };

    await authService.logout(7, rawToken, null);

    expect(RefreshToken.update).toHaveBeenCalledWith(
      { revoked: 1, revoked_at: expect.any(Date) },
      { where: { user_id: 7, token: hashToken(rawToken), revoked: 0 }, transaction: mockState.transaction },
    );
    expect(UserSession.update).not.toHaveBeenCalled();
  });
});
