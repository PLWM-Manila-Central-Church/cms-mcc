"use strict";

const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const {
  ArchiveRecord,
  ArchiveVersion,
  ArchiveAccessLog,
  ArchiveCategory,
  ArchiveHold,
  SystemSetting,
} = require("../models");
const auditLog = require("../helpers/auditLog.helper");
const AppError = require("../helpers/AppError");
const { deleteStoredFile, getStoredFileKey } = require("../middlewares/upload-s3");
const retention = require("../helpers/archiveRetention.helper");

const DAY_MS = 24 * 60 * 60 * 1000;
const FINANCE_CATEGORY = "Financial Records";

// Fixed table names only; type values are validated against this map.
const SYSTEM_TABLES = Object.freeze({
  notifications: "notifications",
  emergency_contacts: "emergency_contacts",
  ministry_assignments: "ministry_assignments",
  ministry_memberships: "ministry_memberships",
  attendance_batch_items: "attendance_batch_items",
});

const cutoffFor = (now) => new Date(new Date(now).getTime() - retention.RETENTION_DAYS * DAY_MS);

exports.isAutoPurgeEnabled = async () => {
  const setting = await SystemSetting.findOne({ where: { key: "archive_auto_purge" } });
  return !setting || String(setting.value) !== "0";
};

exports.setDocumentHold = async (id, { hold, reason }, userId) => {
  const record = await ArchiveRecord.unscoped().findOne({ where: { id } });
  if (!record) throw AppError.notFound("RECORD_NOT_FOUND", "Archive record not found");
  if (Number(record.is_deleted) !== 1) {
    throw AppError.badRequest("NOT_ARCHIVED", "Only an archived record can be held");
  }

  await record.update({ retention_hold: hold ? 1 : 0, hold_reason: hold ? (reason || "Held by administrator") : null });
  auditLog.log({
    userId,
    action: hold ? "HOLD_ARCHIVE_RETENTION" : "RELEASE_ARCHIVE_RETENTION",
    targetTable: "archive_records",
    targetId: id,
  });
  return { id: Number(id), hold: Boolean(hold) };
};

exports.setSystemHold = async (type, id, { hold, reason }, userId) => {
  const table = SYSTEM_TABLES[type];
  if (!table) {
    throw AppError.badRequest("VALIDATION_ERROR", "That archived record type cannot be held");
  }

  if (hold) {
    await ArchiveHold.upsert({
      entity_type: type,
      entity_id: id,
      reason: reason || "Held by administrator",
      created_by: userId || null,
    });
  } else {
    await ArchiveHold.destroy({ where: { entity_type: type, entity_id: id } });
  }

  auditLog.log({
    userId,
    action: hold ? "HOLD_SYSTEM_ARCHIVE_RETENTION" : "RELEASE_SYSTEM_ARCHIVE_RETENTION",
    targetTable: table,
    targetId: id,
  });
  return { id: Number(id), type, hold: Boolean(hold) };
};

exports.getSummary = async (now = new Date()) => {
  const dueDocuments = await ArchiveRecord.unscoped().count({
    where: { is_deleted: 1, retention_hold: 0, purge_after: { [Op.lte]: now } },
  });

  let dueSystem = 0;
  for (const type of retention.AUTO_PURGE_SYSTEM_TYPES) {
    const [row] = await sequelize.query(
      `SELECT COUNT(*) AS total FROM \`${SYSTEM_TABLES[type]}\` t
        WHERE t.is_deleted = 1 AND t.deleted_at IS NOT NULL AND t.deleted_at <= :cutoff
          AND NOT EXISTS (SELECT 1 FROM archive_holds h WHERE h.entity_type = :type AND h.entity_id = t.id)`,
      { replacements: { cutoff: cutoffFor(now), type }, type: QueryTypes.SELECT },
    );
    dueSystem += Number(row?.total || 0);
  }

  return {
    retention_days: retention.RETENTION_DAYS,
    due: { documents: dueDocuments, system_records: dueSystem, total: dueDocuments + dueSystem },
    auto_purge_enabled: await exports.isAutoPurgeEnabled(),
    auto_purge_types: retention.AUTO_PURGE_SYSTEM_TYPES,
    protected_types: retention.PROTECTED_SYSTEM_TYPES,
    finance_documents_exempt: true,
  };
};

exports.purgeDue = async ({ actorId = null, now = new Date(), limit = 100 } = {}) => {
  const result = { documents: 0, system_records: 0, skipped: 0, file_failures: 0 };

  const dueDocuments = await ArchiveRecord.unscoped().findAll({
    where: { is_deleted: 1, retention_hold: 0, purge_after: { [Op.lte]: now } },
    include: [{ model: ArchiveCategory, as: "category", attributes: ["name"], required: false }],
    limit,
  });

  for (const record of dueDocuments) {
    if (record.category && record.category.name === FINANCE_CATEGORY) {
      result.skipped += 1;
      continue;
    }
    try {
      await ArchiveVersion.destroy({ where: { record_id: record.id } });
      await ArchiveAccessLog.destroy({ where: { record_id: record.id } });
      const storedValue = record.file_url;
      await ArchiveRecord.unscoped().destroy({ where: { id: record.id } });
      result.documents += 1;
      try {
        const key = getStoredFileKey(storedValue);
        if (key) await deleteStoredFile(key);
      } catch {
        result.file_failures += 1;
      }
    } catch {
      result.skipped += 1;
    }
  }

  const cutoff = cutoffFor(now);
  for (const type of retention.AUTO_PURGE_SYSTEM_TYPES) {
    const table = SYSTEM_TABLES[type];
    const rows = await sequelize.query(
      `SELECT t.id FROM \`${table}\` t
        WHERE t.is_deleted = 1 AND t.deleted_at IS NOT NULL AND t.deleted_at <= :cutoff
          AND NOT EXISTS (SELECT 1 FROM archive_holds h WHERE h.entity_type = :type AND h.entity_id = t.id)
        LIMIT :limit`,
      { replacements: { cutoff, type, limit }, type: QueryTypes.SELECT },
    );

    for (const row of rows) {
      try {
        await sequelize.query(`DELETE FROM \`${table}\` WHERE id = :id`, { replacements: { id: row.id } });
        result.system_records += 1;
      } catch {
        result.skipped += 1;
      }
    }
  }

  if (actorId) {
    auditLog.log({
      userId: actorId,
      action: "PURGE_ARCHIVE",
      targetTable: "archive_records",
      newValues: result,
    });
  }

  return result;
};
