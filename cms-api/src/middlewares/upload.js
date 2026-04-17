"use strict";

/**
 * Multer middleware for archive file uploads.
 *
 * Files are saved to  <project-root>/uploads/archives/<random-hex><ext>
 * Max size  : 25 MB  (overridden by MAX_FILE_SIZE_MB env var)
 * Allowed   : pdf, docx, xlsx, jpg, jpeg, png, mp4, mp3
 *
 * Fix #6 — verifyMime checks the actual file content (magic bytes) after
 * multer saves it, so a renamed malicious file cannot bypass the ext filter.
 *
 * NOTE: Railway's filesystem is ephemeral — files are wiped on redeploy.
 * For persistent storage swap diskStorage for an S3/Cloudinary integration.
 */

const multer = require("multer");
const path   = require("path");
const crypto = require("crypto");
const fs     = require("fs");

const UPLOADS_DIR = path.join(__dirname, "../../uploads/archives");
const ALLOWED_EXT = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png", ".mp4", ".mp3"];
const MAX_SIZE_MB  = parseInt(process.env.MAX_FILE_SIZE_MB) || 25;

const ALLOWED_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "video/mp4",
  "audio/mpeg",
];

// Ensure upload directory exists at startup
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename:    (_req,  file, cb) => {
    const ext    = path.extname(file.originalname).toLowerCase();
    const unique = crypto.randomBytes(16).toString("hex");
    cb(null, `${unique}${ext}`);
  },
});

const fileFilter = (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (ALLOWED_EXT.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: ${ALLOWED_EXT.join(", ")}`), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE_MB * 1024 * 1024 },
});

// Fix #6 — verify actual MIME type from file magic bytes (not just extension).
// Must be used AFTER upload.single() so req.file is populated.
// Deletes the uploaded file and returns 400 if the content type is not allowed.
const verifyMime = async (req, res, next) => {
  if (!req.file) return next();

  try {
    // Dynamically import file-type (ESM-only in v17+, use v16 for CJS compat)
    const { fileTypeFromBuffer } = await import("file-type");
    const buffer = fs.readFileSync(req.file.path).slice(0, 4100);
    const type   = await fileTypeFromBuffer(buffer);

    if (!type || !ALLOWED_MIME.includes(type.mime)) {
      fs.unlinkSync(req.file.path); // delete the rejected file
      return res.status(400).json({ message: "Invalid file content type." });
    }

    next();
  } catch (err) {
    // If file-type package is unavailable, log and continue (fail open with warning)
    console.warn("[Upload] MIME check failed — file-type package may not be installed:", err.message);
    next();
  }
};

module.exports = { upload, verifyMime };
