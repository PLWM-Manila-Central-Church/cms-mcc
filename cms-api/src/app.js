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
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev")); // Fix #10
app.use(express.json({ limit: "10kb" })); // Fix #9
app.use(express.urlencoded({ extended: true, limit: "10kb" })); // Fix #9

// ── Authenticated file serving for archive uploads ───────────
// Files require a valid JWT — unauthenticated requests get 401.
// Both paths kept so the frontend works whether REACT_APP_API_URL
// ends with /api (Vercel) or not (direct Railway URL).
const fs         = require("fs");
const uploadsDir = path.join(__dirname, "../uploads");

const serveUpload = (req, res) => {
  const safeName = path.basename(req.params.filename); // prevent path traversal
  const filePath = path.join(uploadsDir, "archives", safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }
  res.sendFile(path.resolve(filePath));
};

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

// ── Dropdown aliases for frontend member form ────────────────
const { CellGroup, MinistryGroup } = require("./models");
const verifyToken = require("./middlewares/verifyToken");

// Fix #3 — authenticated file serving (replaces public express.static)
app.get("/uploads/archives/:filename",     verifyToken, serveUpload);
app.get("/api/uploads/archives/:filename", verifyToken, serveUpload);

app.get("/api/members/dropdowns/cell-groups", verifyToken, async (req, res) => {
  const data = await CellGroup.findAll({ order: [["name", "ASC"]] });
  res.json({ success: true, data });
});
app.get("/api/members/dropdowns/groups", verifyToken, async (req, res) => {
  const data = await MinistryGroup.findAll({ order: [["name", "ASC"]] });
  res.json({ success: true, data });
});

// ── Global Error Handler ─────────────────────────────────────
app.use(errorHandler);

module.exports = app;
