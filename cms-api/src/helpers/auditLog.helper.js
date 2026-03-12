"use strict";
const { AuditLog } = require("../models");

const log = async ({ userId, action, targetTable, targetId, oldValues, newValues, ipAddress }) => {
  try {
    await AuditLog.create({
      user_id:      userId,
      action,
      target_table: targetTable || null,
      target_id:    targetId    || null,
      old_values:   oldValues   || null,
      new_values:   newValues   || null,
      ip_address:   ipAddress   || null,
    });
  } catch (err) {
    console.error("[AuditLog] Failed to write log:", err.message);
  }
};

module.exports = { log };
