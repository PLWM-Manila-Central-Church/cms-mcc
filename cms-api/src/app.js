"use strict";

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");
const path    = require("path");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const Sentry  = require("@sentry/node");
const logger  = require("./helpers/logger");

const errorHandler = require("./middlewares/errorHandler");
const requestId    = require("./middlewares/requestId");
const sequelizeHealth = require("./config/db");
const { metricsMiddleware, metricsEndpoint } = require("./helpers/metrics");

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
    if (!origin || allowed.includes(origin) || allowed.includes("*")) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
}));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")); // Fix #10
app.use(express.json({ limit: "500kb" })); // Fix #9

app.get("/metrics", metricsEndpoint);

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

// ── Authenticated file serving for archive uploads ───────────
// Files require a valid JWT — unauthenticated requests get 401.
// Both paths kept so the frontend works whether REACT_APP_API_URL
// ends with /api (Vercel) or not (direct service URL).
const fs         = require("fs");
const uploadsDir = path.join(__dirname, "../uploads");
const { getFileUrl, s3Enabled } = require("./middlewares/upload-s3");

const serveFile = (folder) => (req, res) => {
  const safeName = path.basename(req.params.filename);

  // If S3 is enabled, redirect to the S3/CDN URL
  if (s3Enabled) {
    const url = getFileUrl(`${folder}/${safeName}`);
    return res.redirect(307, url);
  }

  // Fallback: serve from local disk (pre-S3 behavior)
  const filePath = path.join(uploadsDir, folder, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }
  res.sendFile(path.resolve(filePath));
};

const serveUpload   = serveFile("archives");
const serveReceipt  = serveFile("receipts");

// ── Rate Limiters ─────────────────────────────────────────────
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

app.use("/api/auth/login",           loginLimiter);
app.use("/api/auth/forgot-password", forgotPasswordLimiter);
app.use("/api/auth/reset-password",  resetPasswordLimiter);
app.use("/api/auth/refresh-token",   refreshLimiter);

// ── Global API Rate Limiter ───────────────────────────────────
// Catches runaway clients / frontend bugs before they exhaust the DB pool.
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many requests. Please slow down." },
});
app.use("/api/", globalLimiter);

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
app.use("/api/reports",      require("./routes/reports.routes"));

// ── Dropdown aliases for frontend member form ────────────────
const { CellGroup, MinistryGroup } = require("./models");
const verifyToken = require("./middlewares/verifyToken");

const assignedOnlyWhere = (req, roleName, fieldName) => {
  if (req.user?.roleName !== roleName) return {};
  const id = req.user?.[fieldName];
  return id ? { id } : { id: null };
};

// Fix #3 — authenticated file serving (replaces public express.static)
app.get("/uploads/archives/:filename",     verifyToken, serveUpload);
app.get("/api/uploads/archives/:filename", verifyToken, serveUpload);

app.get("/uploads/receipts/:filename",     verifyToken, serveReceipt);
app.get("/api/uploads/receipts/:filename", verifyToken, serveReceipt);

const serveProfile  = serveFile("profiles");

app.get("/uploads/profiles/:filename",     verifyToken, serveProfile);
app.get("/api/uploads/profiles/:filename", verifyToken, serveProfile);

app.get("/api/members/dropdowns/cell-groups", verifyToken, async (req, res) => {
  const data = await CellGroup.findAll({
    where: assignedOnlyWhere(req, "Cell Group Leader", "leadsCellGroupId"),
    order: [["name", "ASC"]],
  });
  res.json({ success: true, data });
});
app.get("/api/members/dropdowns/groups", verifyToken, async (req, res) => {
  const data = await MinistryGroup.findAll({
    where: assignedOnlyWhere(req, "Group Leader", "leadsGroupId"),
    order: [["name", "ASC"]],
  });
  res.json({ success: true, data });
});

// ── Sentry error handler (must come before custom error handler) ──
if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler());
}

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
