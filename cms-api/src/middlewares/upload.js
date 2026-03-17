"use strict";

/**
 * Multer middleware for archive file uploads.
 *
 * Files are saved to  <project-root>/uploads/archives/<random-hex><ext>
 * Max size  : 25 MB  (overridden by MAX_FILE_SIZE_MB env var)
 * Allowed   : pdf, docx, xlsx, jpg, jpeg, png, mp4, mp3
 *
 * NOTE: Railway's filesystem is ephemeral — files are wiped on redeploy.
 * For persistent storage swap diskStorage for an S3/Cloudinary integration
 * and store the returned URL in file_url instead of a local path.
 */

const multer = require("multer");
const path   = require("path");
const crypto = require("crypto");
const fs     = require("fs");

const UPLOADS_DIR = path.join(__dirname, "../../uploads/archives");
const ALLOWED_EXT = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png", ".mp4", ".mp3"];
const MAX_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB) || 25;

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

module.exports = upload;
