"use strict";

const { v4: uuidv4 } = require("uuid");

module.exports = (req, res, next) => {
  // Only trust client-provided request IDs if they look like UUIDs
  // (prevents log injection via crafted header values)
  const raw = req.headers["x-request-id"];
  const id = (raw && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw))
    ? raw
    : uuidv4();
  req.requestId = id;
  res.setHeader("X-Request-ID", id);
  next();
};