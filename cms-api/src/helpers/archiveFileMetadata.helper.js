"use strict";

const path = require("node:path");

const normalizeArchiveFileType = (file) => {
  const extension = path.extname(String(file?.originalname || "")).toLowerCase().replace(/^\./, "");
  const mimeSubtype = String(file?.mimetype || "").split("/")[1]?.split(";")[0]?.toLowerCase();
  const fileType = extension || mimeSubtype || "unknown";

  // The archive_records enum uses "jpg" as the canonical JPEG value.
  return fileType === "jpeg" ? "jpg" : fileType;
};

module.exports = { normalizeArchiveFileType };
