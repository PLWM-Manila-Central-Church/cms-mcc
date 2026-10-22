"use strict";

/**
 * The application keeps business history. HTTP DELETE is intentionally not an
 * available mutation method; use explicit archive, cancel, withdraw, or reverse
 * workflows instead. This guard runs before every /api router so a forgotten
 * legacy route cannot permanently remove data.
 */
module.exports = (req, res, next) => {
  if (req.method !== "DELETE") return next();
  res.set("Allow", "GET, HEAD, POST, PUT, PATCH, OPTIONS");
  return res.status(405).json({
    success: false,
    code: "HARD_DELETE_DISABLED",
    message: "Deleting records is disabled. Use Archive, Restore, or a supported status change.",
  });
};
