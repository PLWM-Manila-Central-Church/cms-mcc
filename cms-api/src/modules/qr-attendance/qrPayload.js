"use strict";

const { randomUUID } = require("node:crypto");

const QR_PREFIX = "MCC";
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const QR_KINDS = new Set(["MEMBER", "BATCH"]);
const MAX_QR_PAYLOAD_LENGTH = 64;

const createPublicId = () => randomUUID();

const formatQrPayload = (kind, publicId) => {
  const normalizedKind = String(kind || "").toUpperCase();
  const normalizedId = String(publicId || "").toLowerCase();
  if (!QR_KINDS.has(normalizedKind) || !UUID_V4.test(normalizedId)) {
    throw new TypeError("Invalid QR attendance identifier");
  }
  return `${QR_PREFIX}:${normalizedKind}:1:${normalizedId}`;
};

const parseQrPayload = (payload) => {
  if (typeof payload !== "string" || payload.length > MAX_QR_PAYLOAD_LENGTH) {
    return null;
  }

  const match = /^MCC:(MEMBER|BATCH):1:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i.exec(payload.trim());
  if (!match) return null;

  return { kind: match[1].toLowerCase(), publicId: match[2].toLowerCase() };
};

module.exports = {
  MAX_QR_PAYLOAD_LENGTH,
  createPublicId,
  formatQrPayload,
  parseQrPayload,
};
