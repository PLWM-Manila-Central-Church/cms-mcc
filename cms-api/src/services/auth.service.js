"use strict";

const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const logger = require("../helpers/logger");
const {
  User, Role, Member, PasswordResetToken,
  RefreshToken, UserSession, RolePermission, Permission,
  MinistryRole, CellGroup, MinistryGroup,
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
const generateAccessToken = (user) => {
  return jwt.sign(
    { userId: user.id },
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

const getUserPermissions = async (roleId) => {
  const rp = await RolePermission.findAll({
    where:   { role_id: roleId },
    include: [{ model: Permission, attributes: ["module", "action"] }],
  });
  return rp.map(r => `${r.Permission.module}:${r.Permission.action}`);
};

// Revoke every outstanding refresh token for a user (password change/reset,
// or refresh-token reuse detection). Forces re-login on all devices.
const revokeAllRefreshTokens = async (userId) => {
  await RefreshToken.update({ revoked: 1 }, { where: { user_id: userId, revoked: 0 } });
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

  const accessToken  = generateAccessToken(user);
  const rawRefresh   = generateRefreshToken(user.id);  // Fix #4

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Fix #4 — store hashed refresh token, return raw token to client
  await RefreshToken.create({ user_id: user.id, token: hashToken(rawRefresh), expires_at: expiresAt, revoked: 0 });
  await UserSession.create({ user_id: user.id, ip_address: ip || null, device: device || null, login_at: new Date() });
  auditLog.log({ userId: user.id, action: "LOGIN", ipAddress: ip });

  const permissions = await getUserPermissions(user.role_id);

  return {
    accessToken,
    refreshToken: rawRefresh,
    forcePasswordChange: user.force_password_change === 1,
    user: {
      id:             user.id,
      email:          user.email,
      roleName:       user.role.role_name,
      memberId:       user.member_id       || null,
      leadsCellGroupId: user.leads_cell_group_id || null,
      leadsGroupId:    user.leads_group_id || null,
      leadsMinistryId: user.leads_ministry_id || null,
      leadsCellGroupName: user.leadsCellGroup?.name || null,
      leadsGroupName:     user.leadsGroup?.name || null,
      leadsMinistryName:  user.leadsMinistry?.name || null,
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

  // Fix #4 — look up the hashed version of the token (including revoked ones
  // so reuse of an already-rotated token can be detected)
  const stored = await RefreshToken.findOne({ where: { token: hashToken(token) } });

  if (!stored || stored.revoked || new Date() > stored.expires_at) {
    // Signature verified but the token is gone/expired/revoked → likely reuse
    // of a rotated token (stolen cookie). Kill every session for this user.
    await revokeAllRefreshTokens(decoded.userId);
    throw new AppError("UNAUTHORIZED", 401, "Refresh token expired or revoked");
  }

  const user = await User.findOne({
      where: { id: decoded.userId, is_deleted: 0 },
      include: [
        { model: Role,   as: "role" },
        { model: Member, as: "member", attributes: ["cell_group_id", "group_id"], required: false },
      ],
    });

  if (!user || !user.is_active)
    throw new AppError("UNAUTHORIZED", 401, "Account deactivated");

  await stored.update({ revoked: 1 });

  const newAccessToken = generateAccessToken(user);
  const newRawRefresh  = generateRefreshToken(user.id);  // Fix #4

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Fix #4 — store hashed version
  await RefreshToken.create({ user_id: user.id, token: hashToken(newRawRefresh), expires_at: expiresAt, revoked: 0 });

  return {
    accessToken:  newAccessToken,
    refreshToken: newRawRefresh,
  };
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
exports.logout = async (userId, token) => {
  if (token) {
    // Fix #4 — look up by hashed token
    await RefreshToken.update({ revoked: 1 }, { where: { user_id: userId, token: hashToken(token) } });
  }
  auditLog.log({ userId, action: "LOGOUT" });
  return { message: "Logged out successfully." };
};
