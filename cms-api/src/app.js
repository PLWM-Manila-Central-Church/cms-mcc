"use strict";

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");
const cookieParser = require("cookie-parser");
require("dotenv").config();

const Sentry  = require("@sentry/node");
const logger  = require("./helpers/logger");

const errorHandler  = require("./middlewares/errorHandler");
const requestId     = require("./middlewares/requestId");
const csrfOriginCheck = require("./middlewares/csrfOrigin");
const sequelizeHealth = require("./config/db");
const { metricsMiddleware, metricsEndpoint } = require("./helpers/metrics");
const { mountRateLimiters } = require("./middlewares/rateLimiters");

const app = express();

// ── Sentry (error tracking) ──────────────────────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: 0.1,
  });
  app.use(Sentry.Handlers.requestHandler());
} else {
  logger.info("Sentry DSN not configured — error tracking disabled");
}
app.set("trust proxy", 1);

app.use(cookieParser());
app.use(requestId);

// ── Request Timeout (prevents stuck requests from exhausting DB pool) ──
app.use((req, res, next) => {
  const skipFor = ["/api/members/bulk"];
  if (skipFor.some(p => req.path.startsWith(p))) return next();
  res.setTimeout(60_000, () => {
    if (!res.headersSent) {
      res.status(408).json({ message: "Request timed out" });
    }
  });
  next();
});

app.use(metricsMiddleware);

// ── Security & Logging ───────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
}));
app.use(cors({
  origin: (origin, callback) => {
    const allowed = (process.env.ALLOWED_ORIGIN || "").split(",").map(o => o.trim()).filter(Boolean);
    // Allow requests with no origin (same-origin, curl, server-to-server)
    // but never allow wildcard * or null (null origin = sandboxed iframes, data: URIs)
    if (!origin) return callback(null, true);
    if (allowed.length === 0 && process.env.NODE_ENV !== "production") {
      return callback(null, true);
    }
    if (allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")); // Fix #10
app.use(express.json({ limit: "500kb" })); // Fix #9

// ── CSRF origin check (cookie-authenticated mutations only) ──
app.use(csrfOriginCheck);

// ── Metrics (optionally protected by METRICS_TOKEN) ──────────
app.get("/metrics", (req, res, next) => {
  const token = process.env.METRICS_TOKEN;
  if (!token) {
    if (process.env.NODE_ENV === "production") {
      logger.warn("METRICS_TOKEN not set — /metrics is exposed unauthenticated");
    }
    return next();
  }
  const provided = req.get("authorization")?.replace(/^Bearer\s+/i, "") || req.query.token;
  if (provided === token) return next();
  return res.status(403).json({ message: "Forbidden" });
}, metricsEndpoint);

app.get("/health", async (_req, res) => {
  try {
    await sequelizeHealth.authenticate();
    res.status(200).json({
      status: "ok",
      service: "plwm-mcc-api",
      uptime: process.uptime(),
      db: "connected",
    });
  } catch (err) {
    res.status(503).json({
      status: "error",
      service: "plwm-mcc-api",
      uptime: process.uptime(),
      db: "disconnected",
    });
  }
});

// ── Rate Limiters ─────────────────────────────────────────────
mountRateLimiters(app);

// ── Public Routes (no auth) ───────────────────────────────────
app.use("/api/public",        require("./routes/public.routes"));
// ── Routes ───────────────────────────────────────────────────
app.use("/api/auth",          require("./routes/auth.routes"));
app.use("/api/dashboard",     require("./routes/dashboard.routes"));
app.use("/api/users",         require("./routes/users.routes"));
app.use("/api/roles",         require("./routes/roles.routes"));
app.use("/api/members",       require("./routes/members.routes"));
app.use("/api/members",       require("./routes/member-extras.routes"));
app.use("/api/cellgroups",    require("./routes/cellgroups.routes"));
app.use("/api/attendance",    require("./routes/attendance.routes"));
app.use("/api/services",      require("./routes/services.routes"));
app.use("/api/services",      require("./routes/service-extras.routes"));
app.use("/api/finance",       require("./routes/finance.routes"));
app.use("/api/events",        require("./routes/events.routes"));
app.use("/api/events",        require("./routes/ministry-invites.routes"));
app.use("/api/inventory",     require("./routes/inventory.routes"));
app.use("/api/archives",      require("./routes/archives.routes"));
app.use("/api/ministry",      require("./routes/ministry.routes"));
app.use("/api/notifications", require("./routes/notifications.routes"));
app.use("/api/settings",      require("./routes/settings.routes"));
app.use("/api/audit",         require("./routes/audit.routes"));
app.use("/api/audit-logs",    require("./routes/audit.routes"));
app.use("/api/member-portal", require("./routes/member-portal.routes"));
app.use("/api/reports",       require("./routes/reports.routes"));

// ── Authenticated file serving for archive uploads ────────────
// Both paths kept so the frontend works whether REACT_APP_API_URL
// ends with /api (Vercel) or not (direct service URL).
const uploadsRoutes = require("./routes/uploads.routes");
app.use("/uploads",     uploadsRoutes);
app.use("/api/uploads", uploadsRoutes);

// ── Sentry error handler (must come before custom error handler) ──
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
