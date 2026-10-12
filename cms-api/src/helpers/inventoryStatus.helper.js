"use strict";

const INVENTORY_STATUSES = Object.freeze([
  "Available",
  "Low Stock",
  "Out of Stock",
  "Under Repair",
]);

const deriveInventoryStatus = ({ quantity, low_stock_threshold, status } = {}) => {
  if (status === "Under Repair") return "Under Repair";

  const availableQuantity = Number(quantity);
  if (!Number.isFinite(availableQuantity) || availableQuantity <= 0) return "Out of Stock";

  const threshold = low_stock_threshold == null || low_stock_threshold === ""
    ? null
    : Number(low_stock_threshold);
  if (threshold != null && Number.isFinite(threshold) && availableQuantity <= threshold) {
    return "Low Stock";
  }

  return "Available";
};

module.exports = { INVENTORY_STATUSES, deriveInventoryStatus };
