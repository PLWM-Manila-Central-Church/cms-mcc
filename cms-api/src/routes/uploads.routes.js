"use strict";

const router = require("express").Router();
const fs = require("fs");
const path = require("path");
const verifyToken = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const { getFileUrl, s3Enabled } = require("../middlewares/upload-s3");

const uploadsDir = path.join(__dirname, "../../uploads");

// Files require a valid JWT — unauthenticated requests get 401.
// Archive files additionally require archives:read, receipts require
// finance:read, so a stolen filename is not enough to read records.
const serveFile = (folder) => (req, res) => {
  const safeName = path.basename(req.params.filename);

  // If S3 is enabled, redirect to the S3/CDN URL
  if (s3Enabled) {
    return res.redirect(307, getFileUrl(`${folder}/${safeName}`));
  }

  // Fallback: serve from local disk (pre-S3 behavior)
  const filePath = path.join(uploadsDir, folder, safeName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: "File not found" });
  }
  // Set caching headers for static files
  res.set("Cache-Control", "public, max-age=86400, immutable");
  res.set("ETag", `"${safeName}"`);
  res.sendFile(path.resolve(filePath));
};

router.get("/archives/:filename", verifyToken, authorize("archives", "read"), serveFile("archives"));
router.get("/receipts/:filename", verifyToken, authorize("finance", "read"), serveFile("receipts"));
router.get("/profiles/:filename", verifyToken, serveFile("profiles"));

module.exports = router;
