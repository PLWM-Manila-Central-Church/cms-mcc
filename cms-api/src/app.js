"use strict";

const express = require("express");
const cors    = require("cors");
const helmet  = require("helmet");
const morgan  = require("morgan");
const path    = require("path");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const errorHandler = require("./middlewares/errorHandler");

const app = express();
app.set("trust proxy", 1);

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
app.use(morgan("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static file serving for archive uploads ──────────────────
// Mounted at BOTH paths because REACT_APP_API_URL on Vercel ends with /api,
// so the frontend builds download URLs as:  <API_URL>/uploads/... = .../api/uploads/...
// We serve under /uploads as well for direct Railway URL access.
const uploadsDir = path.join(__dirname, "../uploads");
app.use("/uploads",     express.static(uploadsDir)); // direct:  https://railway.app/uploads/...
app.use("/api/uploads", express.static(uploadsDir)); // via /api: https://railway.app/api/uploads/...

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
const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { message: "Too many requests. Try again later." },
});

app.use("/api/auth/login",           loginLimiter);
app.use("/api/auth/forgot-password", forgotPasswordLimiter);
app.use("/api/auth/refresh-token",   refreshLimiter);

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
app.use("/api/inventory",     require("./routes/inventory.routes"));
app.use("/api/archives",      require("./routes/archives.routes"));
app.use("/api/ministry",      require("./routes/ministry.routes"));
app.use("/api/notifications", require("./routes/notifications.routes"));
app.use("/api/settings",      require("./routes/settings.routes"));
app.use("/api/audit",         require("./routes/audit.routes"));
app.use("/api/audit-logs",    require("./routes/audit.routes"));

// ── Dropdown aliases for frontend member form ────────────────
const { CellGroup, Group } = require("./models");
const verifyToken = require("./middlewares/verifyToken");

app.get("/api/members/dropdowns/cell-groups", verifyToken, async (req, res) => {
  const data = await CellGroup.findAll({ order: [["name", "ASC"]] });
  res.json({ success: true, data });
});
app.get("/api/members/dropdowns/groups", verifyToken, async (req, res) => {
  const data = await Group.findAll({ order: [["name", "ASC"]] });
  res.json({ success: true, data });
});

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
