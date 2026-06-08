"use strict";

const sequelize = require("../config/db");
const { AuditLog } = require("../models");
const logger = require("./logger");

const tablePk = {
  members: "id",
  users: "id",
  financial_records: "id",
  inventory_items: "id",
  archive_records: "id",
  events: "id",
  services: "id",
  expenses: "id",
  cell_groups: "id",
};

const CREATE_ACTIONS = [
  "CREATE_MEMBER", "CREATE_FINANCE_RECORD", "CREATE_INVENTORY_ITEM",
  "CREATE_ARCHIVE", "CREATE_EXPENSE", "CREATE_EVENT", "CREATE_SERVICE",
  "CREATE_FUND", "CREATE_ACCOUNT", "CREATE_EXPENSE_CATEGORY",
  "UPLOAD_ARCHIVE", "CREATE_CELL_GROUP",
];

const SOFT_DELETE_TABLES = ["archive_records", "financial_records", "members"];

exports.revertLog = async (logId, userId) => {
  const log = await AuditLog.findByPk(logId);
  if (!log) throw { status: 404, message: "Audit log entry not found" };

  const pk = tablePk[log.target_table];
  if (!pk) throw { status: 400, message: `Revert not supported for table ${log.target_table}` };

  if (CREATE_ACTIONS.includes(log.action)) {
    const table = log.target_table;
    if (SOFT_DELETE_TABLES.includes(table)) {
      await sequelize.query(
        `UPDATE ${sequelize.escape(table)} SET is_deleted = 1, deleted_at = NOW() WHERE ${sequelize.escape(pk)} = ?`,
        { replacements: [log.target_id] }
      );
    } else {
      await sequelize.query(
        `DELETE FROM ${sequelize.escape(table)} WHERE ${sequelize.escape(pk)} = ?`,
        { replacements: [log.target_id] }
      );
    }

    await AuditLog.create({
      user_id: userId,
      action: "REVERT_AUDIT",
      target_table: log.target_table,
      target_id: log.target_id,
      old_values: log.new_values,
      new_values: log.old_values,
    });

    return { message: "Record reverted successfully (removed or soft-deleted)" };
  }

  if ((log.action.startsWith("UPDATE_") || log.action.startsWith("CHANGE_")) && log.old_values && typeof log.old_values === "object" && Object.keys(log.old_values).length > 0) {
    const sets = Object.keys(log.old_values)
      .map((col) => `${sequelize.escape(col)} = ?`)
      .join(", ");
    const values = Object.values(log.old_values);

    await sequelize.query(
      `UPDATE ${sequelize.escape(log.target_table)} SET ${sets} WHERE ${sequelize.escape(pk)} = ?`,
      { replacements: [...values, log.target_id] }
    );

    await AuditLog.create({
      user_id: userId,
      action: "REVERT_AUDIT",
      target_table: log.target_table,
      target_id: log.target_id,
      old_values: log.new_values,
      new_values: log.old_values,
    });

    return { message: "Record reverted to previous values" };
  }

  throw { status: 400, message: `Revert not supported for action ${log.action}` };
};