"use strict";
// This migration is intentionally a no-op.
// The payment_method column was already added by 20260312000001.
// Kept here to preserve migration history without breaking existing deployments.
module.exports = {
  up: async () => {},
  down: async () => {},
};
