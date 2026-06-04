"use strict";
const { AuditLog } = require("../models");
const logger       = require("../helpers/logger");

const log = async ({ userId, action, targetTable, targetId, oldValues, newValues, ipAddress }, options = {}) => {
  try {
    await AuditLog.create({
      user_id:      userId,
      action,
      target_table: targetTable || null,
      target_id:    targetId    || null,
      old_values:   oldValues   || null,
      new_values:   newValues   || null,
      ip_address:   ipAddress   || null,
    }, { transaction: options.transaction });
  } catch (err) {
    logger.error(err, "AuditLog failure");
  }
};

module.exports = { log };
