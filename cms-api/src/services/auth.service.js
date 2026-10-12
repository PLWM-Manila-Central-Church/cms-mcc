"use strict";

const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const { Op } = require("sequelize");
const sequelize = require("../config/db");
const logger = require("../helpers/logger");
const {
  User, Role, Member, PasswordResetToken,
  RefreshToken, UserSession, RolePermission, Permission,
  MinistryRole, CellGroup, MinistryGroup, UserLeaderAssignment,
} = require("../models");
const mailer   = require("../utils/mailer");
const auditLog = require("../helpers/auditLog.helper");
const AppError = require("../helpers/AppError");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

// ── Helpers ──────────────────────────────────────────────────

// Fix #11 — slim JWT payload to userId only.
// verifyToken.js re-fetches the full user from DB on every request,
// so embedding extra fields in the token is redundant and increases
// exposure if a token is ever intercepted.
const generateAccessToken = (user, userSessionId = null) => {
  const payload = { userId: user.id };
  const sessionId = Number(userSessionId);
  if (Number.isInteger(sessionId) && sessionId > 0) payload.userSessionId = sessionId;
  return jwt.sign(
    payload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  );
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN || "7d",
  });
};

// Fix #4 — hash refresh tokens before storing so a DB dump
// does not expose active sessions. Same pattern as password reset tokens.
const hashToken = (raw) => crypto.createHash("sha256").update(raw).digest("hex");

// Burned on logins for nonexistent users so response timing does not
// reveal whether an email exists (bcrypt compare cost either way).
const DUMMY_HASH = bcrypt.hashSync("timing-equalization-dummy", BCRYPT_ROUNDS);

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_REUSE_GRACE_MS = 30 * 1000;

const getUserPermissions = async (roleId) => {
  const rp = await RolePermission.findAll({
    where:   { role_id: roleId },
    include: [{ model: Permission, attributes: ["module", "action"] }],
  });
  return rp.map(r => `${r.Permission.module}:${r.Permission.action}`);
};

exports.getUserPermissionsForRole = getUserPermissions;

const getLeaderAssignmentContext = async (user = {}, suppliedRows) => {
  if (user.roleName !== "Leader") return [];
  const rows = suppliedRows || await UserLeaderAssignment.findAll({
    where: { user_id: user.userId || user.id },
    attributes: ["id", "scope_type", "scope_id", "legacy_column", "is_active", "version", "revoked_at"],
    order: [["scope_type", "ASC"], ["scope_id", "ASC"], ["id", "ASC"]],
  });
  const activeRows = rows.filter((row) => Number(row.is_active ?? 1) === 1 && !row.revoked_at);
  const profilePermissions = await require("./leader-access.service").getLeaderPermissionProfiles({
    roleName: user.roleName,
    leaderAssignmentsLoaded: true,
    leaderAssignments: activeRows,
  });
  const cellGroupIds = [...new Set(activeRows.filter((row) => row.scope_type === "cell_group").map((row) => Number(row.scope_id)))];
  const groupIds = [...new Set(activeRows.filter((row) => row.scope_type === "member_group").map((row) => Number(row.scope_id)))];
  const [cellGroups, groups] = await Promise.all([
    cellGroupIds.length ? CellGroup.findAll({ where: { id: { [Op.in]: cellGroupIds } }, attributes: ["id", "name"] }) : [],
    groupIds.length ? MinistryGroup.findAll({ where: { id: { [Op.in]: groupIds } }, attributes: ["id", "name"] }) : [],
  ]);
  const cellGroupNames = new Map(cellGroups.map((team) => [Number(team.id), team.name]));
  const groupNames = new Map(groups.map((team) => [Number(team.id), team.name]));
  return activeRows.map((row) => {
    const type = row.scope_type === "member_group" ? "group" : row.scope_type;
    const scopeId = Number(row.scope_id);
    const teamName = type === "cell_group"
      ? cellGroupNames.get(scopeId) || null
      : groupNames.get(scopeId) || null;
    return {
      id: Number(row.id),
      scopeType: type,
      scopeId,
      scopeKey: `${type === "group" ? "member_group" : type}:${scopeId}`,
      teamName: teamName || `${type === "cell_group" ? "Cell group" : "Group"} #${scopeId}`,
      version: Number(row.version || 1),
      permissions: profilePermissions[type] || [],
    };
  });
};

exports.getLeaderAssignmentContext = getLeaderAssignmentContext;

// Revoke every outstanding refresh token for a user (password change/reset,
// or refresh-token reuse detection). Forces re-login on all devices.
const revokeAllRefreshTokens = async (userId, options = {}) => {
  await RefreshToken.update(
    { revoked: 1, revoked_at: new Date() },
    { where: { user_id: userId, revoked: 0 }, ...(options.transaction && { transaction: options.transaction }) },
  );
};

// ── Login ────────────────────────────────────────────────────
exports.login = async (email, password, ip, device) => {
  const user = await User.findOne({
    where: { email, is_deleted: 0 },
    include: [
      { model: Role,   as: "role" },
      { model: Member, as: "member", attributes: ["cell_group_id", "group_id"], required: false },
      { model: MinistryRole,  as: "leadsMinistry",  attributes: ["id", "name"], required: false },
      { model: CellGroup,     as: "leadsCellGroup", attributes: ["id", "name"], required: false },
      { model: MinistryGroup, as: "leadsGroup",     attributes: ["id", "name"], required: false },
    ],
  });

  if (!user || !user.is_active) {
    await bcrypt.compare(password, DUMMY_HASH); // timing equalization
    throw new AppError("UNAUTHORIZED", 401, "Invalid credentials");
  }

  // Fix #7 — account lockout check. Returns the same generic message as a
  // wrong password so the lock state cannot be used to enumerate accounts.
  const now = new Date();
  const lockActive = user.locked_until && now < new Date(user.locked_until);
  if (lockActive) {
    await bcrypt.compare(password, DUMMY_HASH); // timing equalization
    throw new AppError("UNAUTHORIZED", 401, "Invalid credentials");
  }

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    // Fix #7 — increment failed attempts and lock after 5.
    // A lock that has already expired starts the counter fresh, so a single
    // late failure does not instantly re-lock the account.
    const lockExpired = user.locked_until && now >= new Date(user.locked_until);
    const attempts    = lockExpired ? 1 : (user.failed_login_attempts || 0) + 1;
    const update      = { failed_login_attempts: attempts };
    if (attempts >= LOCKOUT_THRESHOLD) {
      update.locked_until = new Date(Date.now() + LOCKOUT_DURATION_MS);
    } else if (lockExpired) {
      update.locked_until = null;
    }
    await user.update(update);
    throw new AppError("UNAUTHORIZED", 401, "Invalid credentials");
  }

  // Fix #7 — reset lockout counters on successful login
  await user.update({ failed_login_attempts: 0, locked_until: null, last_login_at: new Date() });

  const { accessToken, rawRefresh } = await sequelize.transaction(async (transaction) => {
    const session = await UserSession.create({
      user_id: user.id,
      ip_address: ip || null,
      device: device || null,
      login_at: new Date(),
    }, { transaction });
    const sessionId = Number(session.id);
    const nextAccessToken = generateAccessToken(user, sessionId);
    const nextRawRefresh = generateRefreshToken(user.id);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    // Fix #4 — store hashed refresh tokens and link rotations to this login session.
    await RefreshToken.create({
      user_id: user.id,
      user_session_id: sessionId,
      token: hashToken(nextRawRefresh),
      expires_at: expiresAt,
      revoked: 0,
    }, { transaction });

    return { accessToken: nextAccessToken, rawRefresh: nextRawRefresh };
  });
  auditLog.log({ userId: user.id, action: "LOGIN", ipAddress: ip });

  const permissions = await getUserPermissions(user.role_id);
  const roleName = user.role.role_name;
  const leaderAssignments = roleName === "Leader"
    ? await getLeaderAssignmentContext({ ...user.get({ plain: true }), roleName })
    : [];

  return {
    accessToken,
    refreshToken: rawRefresh,
    forcePasswordChange: user.force_password_change === 1,
    user: {
      id:             user.id,
      email:          user.email,
      roleName,
      memberId:       user.member_id       || null,
      leadsCellGroupId: user.leads_cell_group_id || null,
      leadsGroupId:    user.leads_group_id || null,
      leadsMinistryId: user.leads_ministry_id || null,
      leadsCellGroupName: user.leadsCellGroup?.name || null,
      leadsGroupName:     user.leadsGroup?.name || null,
      leadsMinistryName:  user.leadsMinistry?.name || null,
      leadershipRevision: Number(user.leadership_revision || 0),
      leaderAssignments,
    },
    permissions,
  };
};

// ── Refresh Token ────────────────────────────────────────────
exports.refreshToken = async (token) => {
  if (!token) throw new AppError("UNAUTHORIZED", 401, "Refresh token required");

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET, { algorithms: ["HS256"] });
  } catch {
    throw new AppError("UNAUTHORIZED", 401, "Invalid or expired refresh token");
  }

  const result = await sequelize.transaction(async (transaction) => {
    // Lock the token row so concurrent tabs cannot both rotate it as if each
    // were the first request. A short grace period handles an already-racing
    // request; replay after that window revokes remaining tokens for the user.
    const stored = await RefreshToken.findOne({
      where: { token: hashToken(token) },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!stored) throw new AppError("UNAUTHORIZED", 401, "Refresh token expired or revoked");

    const sessionId = Number(stored.user_session_id) || null;
    if (sessionId) {
      const session = await UserSession.findOne({
        where: { id: sessionId, user_id: decoded.userId, logout_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!session) throw new AppError("UNAUTHORIZED", 401, "Refresh session is closed");
    }

    const now = new Date();
    const expiry = new Date(stored.expires_at);
    if (!Number.isFinite(expiry.getTime()) || now > expiry) {
      if (!stored.revoked) await stored.update({ revoked: 1, revoked_at: now }, { transaction });
      return { rejection: new AppError("UNAUTHORIZED", 401, "Refresh token expired or revoked") };
    }

    if (stored.revoked) {
      const revokedAt = stored.revoked_at ? new Date(stored.revoked_at).getTime() : NaN;
      const recentlyRotated = Number.isFinite(revokedAt) && now.getTime() - revokedAt <= REFRESH_TOKEN_REUSE_GRACE_MS;
      if (!recentlyRotated) {
        await revokeAllRefreshTokens(decoded.userId, { transaction });
        return { rejection: new AppError("UNAUTHORIZED", 401, "Refresh token expired or revoked") };
      }
    } else {
      await stored.update({ revoked: 1, revoked_at: now }, { transaction });
    }

    const user = await User.findOne({
      where: { id: decoded.userId, is_deleted: 0 },
      include: [
        { model: Role, as: "role" },
        { model: Member, as: "member", attributes: ["cell_group_id", "group_id"], required: false },
      ],
      transaction,
    });
    if (!user || !user.is_active) throw new AppError("UNAUTHORIZED", 401, "Account deactivated");

    const newAccessToken = generateAccessToken(user, sessionId);
    const newRawRefresh = generateRefreshToken(user.id);
    const newExpiry = new Date();
    newExpiry.setDate(newExpiry.getDate() + 7);
    await RefreshToken.create({
      user_id: user.id,
      user_session_id: sessionId,
      token: hashToken(newRawRefresh),
      expires_at: newExpiry,
      revoked: 0,
      revoked_at: null,
    }, { transaction });

    return { accessToken: newAccessToken, refreshToken: newRawRefresh };
  });
  // Persist security revocations before reporting rejection. Throwing inside
  // the managed transaction would roll those writes back.
  if (result.rejection) throw result.rejection;
  return result;
};
// ── Forgot Password ──────────────────────────────────────────
exports.forgotPassword = async (email) => {
  const user = await User.findOne({ where: { email, is_deleted: 0 } });

  // Always return same message to prevent email enumeration
  if (!user) return { message: "If that email exists, a reset link was sent." };

  const rawToken  = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const expiresAt = new Date(Date.now() + 3600 * 1000);

  await PasswordResetToken.update({ used: 1 }, { where: { user_id: user.id, used: 0 } });
  await PasswordResetToken.create({ user_id: user.id, token: tokenHash, expires_at: expiresAt, used: 0 });

  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const resetUrl    = `${frontendUrl}/reset-password?token=${rawToken}`;

  mailer.sendPasswordReset({ to: user.email, resetUrl }).catch((err) => {
    logger.error(err, "Failed to send password reset email:")
  });

  const isDev  = process.env.NODE_ENV === "development";
  const isLocal = !process.env.RENDER && !process.env.VERCEL;
  return {
    message: "If that email exists, a reset link was sent.",
    ...(isDev && isLocal && { dev_token: rawToken, dev_reset_url: resetUrl }),
  };
};

// ── Reset Password ───────────────────────────────────────────
exports.resetPassword = async (token, newPassword) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record    = await PasswordResetToken.findOne({ where: { token: tokenHash, used: 0 } });

  if (!record || new Date() > record.expires_at)
    throw AppError.badRequest("VALIDATION", "Token expired or invalid");

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await User.update({ password_hash: hash, force_password_change: 0 }, { where: { id: record.user_id } });
  await record.update({ used: 1 });
  // Invalidate all sessions — a reset link must not leave existing
  // refresh tokens (e.g. an attacker's) usable.
  await revokeAllRefreshTokens(record.user_id);

  auditLog.log({ userId: record.user_id, action: "RESET_PASSWORD" });
  return { message: "Password updated successfully." };
};

// ── Change Password ──────────────────────────────────────────
exports.changePassword = async (userId, currentPassword, newPassword) => {
  const user  = await User.findByPk(userId);
  if (!user) throw AppError.notFound("RECORD_NOT_FOUND", "User not found");

  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) throw AppError.badRequest("VALIDATION", "Current password is incorrect");

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.update({ password_hash: hash, force_password_change: 0 });
  // Revoke other sessions so a stolen refresh token dies with the old password
  await revokeAllRefreshTokens(userId);

  auditLog.log({ userId, action: "CHANGE_PASSWORD" });
  return { message: "Password changed successfully." };
};

// ── Logout ───────────────────────────────────────────────────
exports.logout = async (userId, token, userSessionId = null) => {
  const now = new Date();
  await sequelize.transaction(async (transaction) => {
    let sessionId = Number(userSessionId) || null;
    const tokenHash = token ? hashToken(token) : null;
    if (tokenHash) {
      // Legacy tokens may not yet carry a session link; use the row link when present.
      const stored = await RefreshToken.findOne({
        where: { user_id: userId, token: tokenHash },
        attributes: ["user_session_id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!sessionId && stored?.user_session_id) sessionId = Number(stored.user_session_id);
      await RefreshToken.update(
        { revoked: 1, revoked_at: now },
        { where: { user_id: userId, token: tokenHash, revoked: 0 }, transaction },
      );
    }

    if (sessionId) {
      await RefreshToken.update(
        { revoked: 1, revoked_at: now },
        { where: { user_id: userId, user_session_id: sessionId, revoked: 0 }, transaction },
      );
      await UserSession.update(
        { logout_at: now },
        { where: { id: sessionId, user_id: userId, logout_at: null }, transaction },
      );
    }
  });
  auditLog.log({ userId, action: "LOGOUT" });
  return { message: "Logged out successfully." };
};
