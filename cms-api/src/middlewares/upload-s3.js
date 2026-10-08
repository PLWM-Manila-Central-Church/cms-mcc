"use strict";

const multer = require("multer");
const multerS3 = require("multer-s3");
const { S3Client, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const path = require("path");
const crypto = require("crypto");
const fs = require("fs");
const logger = require("../helpers/logger");

const S3_ENDPOINT = process.env.S3_ENDPOINT;
const S3_BUCKET   = process.env.S3_BUCKET;
const S3_REGION   = process.env.S3_REGION || "ap-southeast-1";
const S3_KEY      = process.env.S3_ACCESS_KEY;
const S3_SECRET   = process.env.S3_SECRET_KEY;
const CDN_URL     = process.env.CDN_URL || "";

const s3Enabled = !!(S3_ENDPOINT && S3_BUCKET && S3_KEY && S3_SECRET);

let s3Client = null;
if (s3Enabled) {
  s3Client = new S3Client({
    endpoint: S3_ENDPOINT,
    region: S3_REGION,
    credentials: { accessKeyId: S3_KEY, secretAccessKey: S3_SECRET },
    forcePathStyle: true,
  });
  logger.info("S3 storage configured", { bucket: S3_BUCKET });
} else {
  logger.warn("S3 not configured — falling back to local disk storage");
}

const ALLOWED_ARCHIVE_EXT  = [".pdf", ".docx", ".xlsx", ".jpg", ".jpeg", ".png", ".mp4", ".mp3"];
const ALLOWED_RECEIPT_EXT  = [".pdf", ".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_PROFILE_EXT  = [".jpg", ".jpeg", ".png", ".webp"];
const ALLOWED_EVENT_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp"];

// Declared MIME types must match the extension allowlist — extension-only
// checks accept renamed polyglot/HTML payloads.
const ALLOWED_ARCHIVE_MIME = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg", "image/png", "video/mp4", "audio/mpeg",
];
const ALLOWED_RECEIPT_MIME = ["application/pdf", "image/jpeg", "image/png", "image/webp"];
const ALLOWED_PROFILE_MIME = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_EVENT_IMAGE_MIME = ["image/jpeg", "image/png", "image/webp"];

const createS3Storage = (folder) =>
  multerS3({
    s3: s3Client,
    bucket: S3_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = crypto.randomBytes(16).toString("hex");
      cb(null, `${folder}/${unique}${ext}`);
    },
  });

const createDiskFallback = (folder) => {
  const uploadsPath = path.join(__dirname, "../..", "uploads", folder);
  if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true });

  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsPath),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      const unique = crypto.randomBytes(16).toString("hex");
      cb(null, `${unique}${ext}`);
    },
  });
};

const fileFilter = (allowedExt, allowedMime) => (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = !file.mimetype || allowedMime.includes(file.mimetype);
  if (allowedExt.includes(ext) && mimeOk) {
    cb(null, true);
  } else {
    cb(new Error(`File type not allowed. Allowed: ${allowedExt.join(", ")}`), false);
  }
};

// ── Exported upload middlewares ────────────────────────────────

exports.archiveUpload = s3Enabled
  ? multer({
      storage: createS3Storage("archives"),
      fileFilter: fileFilter(ALLOWED_ARCHIVE_EXT, ALLOWED_ARCHIVE_MIME),
      limits: { fileSize: 25 * 1024 * 1024 },
    })
  : multer({
      storage: createDiskFallback("archives"),
      fileFilter: fileFilter(ALLOWED_ARCHIVE_EXT, ALLOWED_ARCHIVE_MIME),
      limits: { fileSize: 25 * 1024 * 1024 },
    });

exports.receiptUpload = s3Enabled
  ? multer({
      storage: createS3Storage("receipts"),
      fileFilter: fileFilter(ALLOWED_RECEIPT_EXT, ALLOWED_RECEIPT_MIME),
      limits: { fileSize: 10 * 1024 * 1024 },
    })
  : multer({
      storage: createDiskFallback("receipts"),
      fileFilter: fileFilter(ALLOWED_RECEIPT_EXT, ALLOWED_RECEIPT_MIME),
      limits: { fileSize: 10 * 1024 * 1024 },
    });

exports.profileUpload = s3Enabled
  ? multer({
      storage: createS3Storage("profiles"),
      fileFilter: fileFilter(ALLOWED_PROFILE_EXT, ALLOWED_PROFILE_MIME),
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  : multer({
      storage: createDiskFallback("profiles"),
      fileFilter: fileFilter(ALLOWED_PROFILE_EXT, ALLOWED_PROFILE_MIME),
      limits: { fileSize: 5 * 1024 * 1024 },
    });

exports.eventImageUpload = s3Enabled
  ? multer({
      storage: createS3Storage("event-images"),
      fileFilter: fileFilter(ALLOWED_EVENT_IMAGE_EXT, ALLOWED_EVENT_IMAGE_MIME),
      limits: { fileSize: 5 * 1024 * 1024 },
    })
  : multer({
      storage: createDiskFallback("event-images"),
      fileFilter: fileFilter(ALLOWED_EVENT_IMAGE_EXT, ALLOWED_EVENT_IMAGE_MIME),
      limits: { fileSize: 5 * 1024 * 1024 },
    });

exports.getFileUrl = (key) => {
  if (CDN_URL) return `${CDN_URL.replace(/\/$/, "")}/${key}`;
  if (s3Enabled) return `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
  return `/uploads/${key}`;
};

exports.deleteStoredFile = async (key) => {
  if (!key) return;
  if (s3Enabled) {
    await s3Client.send(new DeleteObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    return;
  }
  const filePath = path.resolve(__dirname, "../..", "uploads", key);
  const uploadsRoot = path.resolve(__dirname, "../..", "uploads") + path.sep;
  if (!filePath.startsWith(uploadsRoot)) throw new Error("Invalid upload key");
  await fs.promises.rm(filePath, { force: true });
};

exports.sendStoredFile = async (key, res) => {
  if (!key) return res.status(404).json({ message: "File not found" });
  const contentTypes = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };
  const contentType = contentTypes[path.extname(key).toLowerCase()];
  if (!contentType) return res.status(415).json({ message: "Unsupported image type" });
  res.set("Content-Type", contentType);
  res.set("Cache-Control", "private, max-age=3600");
  if (s3Enabled) {
    const object = await s3Client.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: key }));
    object.Body.pipe(res);
    return;
  }
  const filePath = path.resolve(__dirname, "../..", "uploads", key);
  const uploadsRoot = path.resolve(__dirname, "../..", "uploads") + path.sep;
  if (!filePath.startsWith(uploadsRoot) || !fs.existsSync(filePath)) return res.status(404).json({ message: "File not found" });
  return res.sendFile(filePath);
};

exports.s3Enabled = s3Enabled;
