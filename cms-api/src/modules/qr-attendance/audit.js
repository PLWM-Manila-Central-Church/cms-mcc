"use strict";

const { AuditLog } = require("../../models");

const writeQrAudit = async ({
  actorId,
  action,
  table,
  recordId = null,
  oldValues = null,
  newValues = null,
  ipAddress = null,
  transaction,
}) => AuditLog.create({
  user_id: actorId || null,
  action,
  target_table: table,
  target_id: recordId,
  old_values: oldValues,
  new_values: newValues,
  ip_address: ipAddress,
}, { transaction });

module.exports = { writeQrAudit };
