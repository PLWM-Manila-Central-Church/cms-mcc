"use strict";

const mockState = {};

jest.mock("../src/config/db", () => ({
  transaction: jest.fn(async (callback) => {
    mockState.transactionCommitted = false;
    const result = await callback(mockState.transaction);
    mockState.transactionCommitted = true;
    return result;
  }),
}));
jest.mock("../src/models", () => ({
  User: { findOne: jest.fn(async () => mockState.user) },
  Role: {},
  Member: {},
  PasswordResetToken: {},
  RefreshToken: {
    findOne: jest.fn(async () => mockState.storedToken),
    create: jest.fn(async (values) => values),
    update: jest.fn(async () => [1]),
  },
  UserSession: {
    findOne: jest.fn(async () => mockState.userSession),
    create: jest.fn(async (values) => ({ id: 41, ...values })),
    update: jest.fn(async () => [1]),
  },
  RolePermission: {},
  Permission: {},
  MinistryRole: {},
  CellGroup: {},
  MinistryGroup: {},
  UserLeaderAssignment: {},
}));
jest.mock("../src/helpers/logger", () => ({ error: jest.fn(), warn: jest.fn(), info: jest.fn() }));
jest.mock("../src/helpers/auditLog.helper", () => ({ log: jest.fn() }));
jest.mock("../src/utils/mailer", () => ({ sendPasswordReset: jest.fn() }));

const jwt = require("jsonwebtoken");
const { RefreshToken } = require("../src/models");
const authService = require("../src/services/auth.service");

describe("refresh-token concurrency and replay handling", () => {
  const originalEnv = {
    jwt: process.env.JWT_SECRET,
    refresh: process.env.REFRESH_TOKEN_SECRET,
  };

  beforeAll(() => {
    process.env.JWT_SECRET = "qa-test-jwt-secret-with-more-than-32-characters";
    process.env.REFRESH_TOKEN_SECRET = "qa-test-refresh-secret-with-more-than-32-characters";
  });

  afterAll(() => {
    if (originalEnv.jwt === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalEnv.jwt;
    if (originalEnv.refresh === undefined) delete process.env.REFRESH_TOKEN_SECRET;
    else process.env.REFRESH_TOKEN_SECRET = originalEnv.refresh;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockState.transaction = { LOCK: { UPDATE: "UPDATE" } };
    mockState.userSession = { id: 41, user_id: 7, logout_at: null };
    mockState.user = {
      id: 7,
      role_id: 1,
      is_active: 1,
      is_deleted: 0,
      role: { role_name: "System Admin" },
    };
    mockState.storedToken = {
      id: 14,
      user_id: 7,
      user_session_id: 41,
      revoked: 0,
      revoked_at: null,
      expires_at: new Date(Date.now() + 60_000),
      update: jest.fn(async (values) => Object.assign(mockState.storedToken, values)),
    };
  });

  const makeRawToken = () => jwt.sign({ userId: 7, userSessionId: 41 }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: "1h" });

  it("rotates an active token atomically and records the rotation time", async () => {
    const result = await authService.refreshToken(makeRawToken());

    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBeTruthy();
    expect(mockState.storedToken.update).toHaveBeenCalledWith(expect.objectContaining({ revoked: 1, revoked_at: expect.any(Date) }), { transaction: mockState.transaction });
    expect(RefreshToken.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 7, user_session_id: 41, revoked: 0, revoked_at: null }), { transaction: mockState.transaction });
    expect(jwt.verify(result.accessToken, process.env.JWT_SECRET).userSessionId).toBe(41);
  });

  it("accepts a just-rotated token inside the short concurrent-request grace window", async () => {
    mockState.storedToken.revoked = 1;
    mockState.storedToken.revoked_at = new Date(Date.now() - 1000);

    const result = await authService.refreshToken(makeRawToken());

    expect(result.refreshToken).toBeTruthy();
    expect(mockState.storedToken.update).not.toHaveBeenCalled();
    expect(RefreshToken.update).not.toHaveBeenCalled();
    expect(RefreshToken.create).toHaveBeenCalledTimes(1);
  });

  it("revokes remaining sessions only for a replay outside the grace window", async () => {
    mockState.storedToken.revoked = 1;
    mockState.storedToken.revoked_at = new Date(Date.now() - 60_000);

    await expect(authService.refreshToken(makeRawToken())).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(RefreshToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ revoked: 1, revoked_at: expect.any(Date) }),
      expect.objectContaining({ where: { user_id: 7, revoked: 0 }, transaction: mockState.transaction }),
    );
    expect(RefreshToken.create).not.toHaveBeenCalled();
    expect(mockState.transactionCommitted).toBe(true);
  });

  it("commits expiration revocation before rejecting refresh", async () => {
    mockState.storedToken.expires_at = new Date(Date.now() - 60_000);
    await expect(authService.refreshToken(makeRawToken())).rejects.toMatchObject({ status: 401 });
    expect(mockState.storedToken.update).toHaveBeenCalled();
    expect(mockState.transactionCommitted).toBe(true);
    expect(RefreshToken.create).not.toHaveBeenCalled();
  });

  it("does not revoke other sessions for an unknown refresh token", async () => {
    mockState.storedToken = null;

    await expect(authService.refreshToken(makeRawToken())).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(RefreshToken.update).not.toHaveBeenCalled();
  });

  it("rejects refresh when the linked user session has already been closed", async () => {
    mockState.userSession = null;

    await expect(authService.refreshToken(makeRawToken())).rejects.toMatchObject({ code: "UNAUTHORIZED", status: 401 });
    expect(RefreshToken.create).not.toHaveBeenCalled();
  });
});
