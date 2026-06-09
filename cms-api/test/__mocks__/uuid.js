// Jest mock for uuid v14 — avoids ESM export syntax that Jest can't parse.
// uuid v14's dist-node/index.js uses `export { ... }` syntax even though it's
// resolved as CJS via Node's package.json exports field. Jest's require() path
// bypasses this and hits the raw ESM syntax. This mock provides a pure CJS
// implementation of v4 (the only uuid function used by this project).

const crypto = require("crypto");

function v4() {
  // RFC 4122 version 4 UUID
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // variant 1

  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

module.exports = {
  v1: v4, // fallback — v1 not used, but keep API-compatible
  v3: v4,
  v4,
  v5: v4,
  NIL: "00000000-0000-0000-0000-000000000000",
  version: (uuid) => (uuid && uuid.length === 36 ? 4 : undefined),
  validate: (uuid) => typeof uuid === "string" && uuid.length === 36,
  stringify: (arr) => arr.join(""),
  parse: () => [],
};