"use strict";

const { rateLimit } = require("express-rate-limit");
const jwt = require("jsonwebtoken");
const { isIP } = require("node:net");

const QR_API_PREFIXES = ["/api/qr-attendance", "/api/member-portal/attendance-qr"];

const isQrApiPath = (req) => {
  const path = String(req.originalUrl || req.url || "").split("?", 1)[0];
  return QR_API_PREFIXES.some((prefix) => path === prefix || path.startsWith(prefix + "/"));
};

const getIpRateLimitKey = (req) => {
  const ip = String(req.ip || "");
  return `ip:${isIP(ip) ? ip : "unknown"}`;
};

const getGlobalRateLimitKey = (req) => {
  const authorization = String(req.headers?.authorization || "");
  const bearerToken = /^Bearer\s+(.+)$/i.exec(authorization)?.[1] || null;
  const token = req.cookies?.accessToken || bearerToken;
  if (token && process.env.JWT_SECRET) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
      const userId = Number(decoded?.userId);
      if (Number.isSafeInteger(userId) && userId > 0) return `user:${userId}`;
    } catch {
      // Invalid, expired, or unverifiable tokens stay in the shared IP bucket.
    }
  }
  return getIpRateLimitKey(req);
};

const qrNetworkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "QR_NETWORK_RATE_LIMIT", message: "Too many QR attendance requests from this network. Please retry shortly." } },
});

const qrUserLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => (req.user?.userId
    ? "qr-user:" + req.user.userId
    : getIpRateLimitKey(req).replace(/^ip:/, "qr-ip:")),
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: "QR_USER_RATE_LIMIT", message: "Too many QR attendance requests. Please retry shortly." } },
});

// ── Auth endpoint limiters ────────────────────────────────────
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many login attempts. Try again later." },
});

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { message: "Too many password reset requests. Try again later." },
});

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { message: "Too many password reset attempts. Try again later." },
});

const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many requests. Try again later." },
});

// ── Global API limiter ────────────────────────────────────────
// Catches runaway clients / frontend bugs before they exhaust the DB pool.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  keyGenerator: getGlobalRateLimitKey,
  skip: isQrApiPath,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});

// ── Mutation-heavy endpoint limiters ──────────────────────────
const bulkImportLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { message: "Too many bulk imports. Try again later." },
});

const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  message: { message: "Too many search requests. Slow down." },
});

const eventRegisterLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { message: "Too many event registrations. Slow down." },
});

// ── User detail enumeration limiter (blocks sequential ID scanning) ──
const userDetailLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many requests. Try again later." },
});

const mountRateLimiters = (app) => {
  app.use("/api/auth/login",           loginLimiter);
  app.use("/api/auth/forgot-password", forgotPasswordLimiter);
  app.use("/api/auth/reset-password",  resetPasswordLimiter);
  app.use("/api/auth/refresh-token",   refreshLimiter);
  app.use("/api/auth/refresh",         refreshLimiter);

  app.use("/api/", globalLimiter);
  app.use("/api/qr-attendance", qrNetworkLimiter);
  app.use("/api/member-portal/attendance-qr", qrNetworkLimiter);

  app.use("/api/members/bulk",         bulkImportLimiter);
  app.use("/api/members/scope/search", searchLimiter);
  app.use("/api/events/register",      eventRegisterLimiter);
  app.use("/api/events/:id/registrations", eventRegisterLimiter);
  app.use("/api/member-portal/events", eventRegisterLimiter);

  app.use("/api/users", userDetailLimiter);
};

module.exports = {
  isQrApiPath,
  getGlobalRateLimitKey,
  getIpRateLimitKey,
  mountRateLimiters,
  qrUserLimiter,
};
