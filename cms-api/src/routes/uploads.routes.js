"use strict";

const router = require("express").Router();
const path = require("path");
const verifyToken = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const { sendStoredUpload } = require("../middlewares/upload-s3");
const archivesService = require("../services/archives.service");

// Files require a valid JWT — unauthenticated requests get 401.
// Archive files additionally require archives:read, receipts require
// finance:read, so a stolen filename is not enough to read records.
const serveFile = (folder, { inline = false } = {}) => (req, res, next) => {
  const candidate = String(req.params.filename || "").replace(/\\/g, "/");
  const safeName = path.posix.basename(candidate);
  if (!safeName || safeName === "." || safeName === "..") return res.status(404).json({ message: "File not found" });
  const storageKey = `${folder}/${safeName}`;
  const assertVisibility = folder === "archives"
    ? archivesService.assertStoredFileVisible(storageKey, req.user?.roleName)
    : Promise.resolve();
  assertVisibility
    .then(() => sendStoredUpload(storageKey, res, { inline }))
    .catch(next);
};

router.get("/archives/:filename", verifyToken, authorize("archives", "read"), serveFile("archives"));
router.get("/receipts/:filename", verifyToken, authorize("finance", "read"), serveFile("receipts"));
router.get("/profiles/:filename", verifyToken, serveFile("profiles", { inline: true }));

module.exports = router;
