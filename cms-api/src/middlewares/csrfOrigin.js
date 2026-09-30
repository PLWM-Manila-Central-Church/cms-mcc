"use strict";

// ── CSRF defense for cookie-based auth ────────────────────────
// Auth cookies use SameSite=none in production (frontend and API live on
// different origins), so the browser will attach them to cross-site
// requests. Modern browsers always send an Origin header on cross-site
// state-changing requests, so we reject mutating requests whose
// Origin/Referer is not allowlisted whenever they ride on the auth cookie.
// Requests authenticated via the Authorization header, or with no access
// cookie at all, are not CSRF-able and pass through untouched.

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const allowedOrigins = () =>
  (process.env.ALLOWED_ORIGIN || "").split(",").map(o => o.trim()).filter(Boolean);

module.exports = function csrfOriginCheck(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  if (!req.cookies?.accessToken) return next();

  const allowed = allowedOrigins();

  // No allowlist configured outside production (dev convenience) —
  // in production an empty allowlist rejects every cross-site mutation.
  if (allowed.length === 0 && process.env.NODE_ENV !== "production") return next();

  let source = req.headers.origin;
  if (!source && req.headers.referer) {
    try { source = new URL(req.headers.referer).origin; } catch { source = null; }
  }
  if (!source) return next(); // non-browser client holding a cookie — not a CSRF vector

  if (allowed.includes(source)) return next();
  return res.status(403).json({ success: false, message: "Cross-site request rejected" });
};
