"use strict";

const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");
const {
  User, Role, Member, PasswordResetToken,
  RefreshToken, UserSession, RolePermission, Permission,
} = require("../models");
const mailer   = require("../utils/mailer");
const auditLog = require("../helpers/auditLog.helper");

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

const getUserPermissions = async (roleId) => {
  const rp = await RolePermission.findAll({
    where:   { role_id: roleId },
    include: [{ model: Permission, attributes: ["module", "action"] }],
  });
  return rp.map(r => `${r.Permission.module}:${r.Permission.action}`);
};

// ── Login ────────────────────────────────────────────────────
exports.login = async (email, password, ip, device) => {
  const user = await User.findOne({
    where: { email },
    include: [
      { model: Role,   as: "role" },
      { model: Member, as: "member", attributes: ["cell_group_id", "group_id"], required: false },
    ],
  });

  if (!user || !user.is_active)
    throw { status: 401, message: "Invalid credentials" };

  // Fix #7 — account lockout check
  if (user.locked_until && new Date() < new Date(user.locked_until))
    throw { status: 429, message: "Account temporarily locked. Try again later." };

  const match = await bcrypt.compare(password, user.password_hash);

  if (!match) {
    // Fix #7 — increment failed attempts and lock after 5
    const attempts = (user.failed_login_attempts || 0) + 1;
    const update   = { failed_login_attempts: attempts };
    if (attempts >= 5) update.locked_until = new Date(Date.now() + 15 * 60 * 1000);
    await user.update(update);
    throw { status: 401, message: "Invalid credentials" };
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
      ministryRoleId: user.ministry_role_id || null,
    },
    permissions,
  };
};

// ── Refresh Token ────────────────────────────────────────────
exports.refreshToken = async (token) => {
  if (!token) throw { status: 401, message: "Refresh token required" };

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET);
  } catch {
    throw { status: 401, message: "Invalid or expired refresh token" };
  }

  // Fix #4 — look up the hashed version of the token
  const stored = await RefreshToken.findOne({ where: { token: hashToken(token), revoked: 0 } });

  if (!stored || new Date() > stored.expires_at)
    throw { status: 401, message: "Refresh token expired or revoked" };

  const user = await User.findByPk(decoded.userId, {
    include: [
      { model: Role,   as: "role" },
      { model: Member, as: "member", attributes: ["cell_group_id", "group_id"], required: false },
    ],
  });

  if (!user || !user.is_active)
    throw { status: 401, message: "Account deactivated" };

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
  const user = await User.findOne({ where: { email } });

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
    console.error("[Auth] Failed to send password reset email:", err.message);
  });

  const isDev = process.env.NODE_ENV === "development";
  return {
    message: "If that email exists, a reset link was sent.",
    ...(isDev && { dev_token: rawToken, dev_reset_url: resetUrl }),
  };
};

// ── Reset Password ───────────────────────────────────────────
exports.resetPassword = async (token, newPassword) => {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record    = await PasswordResetToken.findOne({ where: { token: tokenHash, used: 0 } });

  if (!record || new Date() > record.expires_at)
    throw { status: 400, message: "Token expired or invalid" };

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await User.update({ password_hash: hash, force_password_change: 0 }, { where: { id: record.user_id } });
  await record.update({ used: 1 });

  auditLog.log({ userId: record.user_id, action: "RESET_PASSWORD" });
  return { message: "Password updated successfully." };
};

// ── Change Password ──────────────────────────────────────────
exports.changePassword = async (userId, currentPassword, newPassword) => {
  const user  = await User.findByPk(userId);
  const match = await bcrypt.compare(currentPassword, user.password_hash);
  if (!match) throw { status: 400, message: "Current password is incorrect" };

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  await user.update({ password_hash: hash, force_password_change: 0 });

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
