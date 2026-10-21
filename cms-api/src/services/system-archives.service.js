"use strict";

const { QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const auditLog = require("../helpers/auditLog.helper");
const AppError = require("../helpers/AppError");
const cache = require("../helpers/cache.helper");
const {
  User,
  Member,
  Event,
  Service,
  FinancialRecord,
  CellGroup,
  InventoryItem,
  MinistryRole,
  ArchiveCategory,
  Attachment,
} = require("../models");

// Fixed SQL fragments only; callers can select a known type but cannot provide
// table or column names. The system archive contains retained business data,
// while uploaded document archives remain in their existing workflow.
const SOURCES = Object.freeze({
  users: {
    label: "User account", table: "users", model: User,
    title: "COALESCE(NULLIF(archived_email, ''), email)",
  },
  members: {
    label: "Member", table: "members", model: Member,
    title: "TRIM(CONCAT(first_name, ' ', last_name))",
  },
  events: { label: "Event", table: "events", model: Event, title: "title" },
  services: { label: "Service", table: "services", model: Service, title: "title" },
  finance_records: {
    label: "Giving record", table: "financial_records", model: FinancialRecord,
    title: "CONCAT('Giving record #', id, ' — ', transaction_date)",
  },
  cell_groups: { label: "Cell group", table: "cell_groups", model: CellGroup, title: "name" },
  inventory_items: { label: "Inventory item", table: "inventory_items", model: InventoryItem, title: "name" },
  ministry_roles: { label: "Ministry role", table: "ministry_roles", model: MinistryRole, title: "name" },
  archive_categories: { label: "Archive category", table: "archive_categories", model: ArchiveCategory, title: "name" },
  finance_attachments: { label: "Receipt attachment", table: "attachments", model: Attachment, title: "file_name" },
});

const getUnionSql = (sourceTypes = Object.keys(SOURCES)) => sourceTypes.map((type) => {
  const source = SOURCES[type];
  return `SELECT '${type}' AS entity_type, '${source.label}' AS entity_label, id AS entity_id, ${source.title} AS title, deleted_at AS archived_at, deleted_by AS archived_by FROM ${source.table} WHERE is_deleted = 1`;
}).join(" UNION ALL ");

exports.getArchivedSystemRecords = async ({ page = 1, limit = 25, type, search } = {}) => {
  const normalizedType = type ? String(type) : null;
  if (normalizedType && !SOURCES[normalizedType]) {
    throw AppError.badRequest("INVALID_ARCHIVE_TYPE", "Choose a valid archived record type");
  }
  const currentPage = Math.max(1, Number.parseInt(page, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, Number.parseInt(limit, 10) || 25));
  const offset = (currentPage - 1) * pageSize;
  const normalizedSearch = String(search || "").trim().slice(0, 120) || null;
  const unionSql = getUnionSql();
  const whereSql = "WHERE (:type IS NULL OR entity_type = :type) AND (:search IS NULL OR title LIKE CONCAT('%', :search, '%'))";
  const replacements = { type: normalizedType, search: normalizedSearch };
  const [records, countRows] = await Promise.all([
    sequelize.query(
      `SELECT * FROM (${unionSql}) AS system_archives ${whereSql} ORDER BY archived_at DESC, entity_type ASC, entity_id DESC LIMIT :limit OFFSET :offset`,
      { replacements: { ...replacements, limit: pageSize, offset }, type: QueryTypes.SELECT },
    ),
    sequelize.query(
      `SELECT COUNT(*) AS total FROM (${unionSql}) AS system_archives ${whereSql}`,
      { replacements, type: QueryTypes.SELECT },
    ),
  ]);
  const total = Number(countRows[0]?.total || 0);
  return {
    records,
    total,
    page: currentPage,
    limit: pageSize,
    total_pages: Math.ceil(total / pageSize),
    types: Object.entries(SOURCES).map(([value, source]) => ({ value, label: source.label })),
  };
};

exports.restoreSystemRecord = async (type, id, restoredBy) => {
  const source = SOURCES[String(type)];
  if (!source) throw AppError.badRequest("INVALID_ARCHIVE_TYPE", "Choose a valid archived record type");
  const recordId = Number(id);
  if (!Number.isSafeInteger(recordId) || recordId <= 0) {
    throw AppError.notFound("ARCHIVED_RECORD_NOT_FOUND", "Archived record not found");
  }

  const result = await sequelize.transaction(async (transaction) => {
    const record = await source.model.unscoped().findOne({
      where: { id: recordId, is_deleted: 1 },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!record) throw AppError.notFound("ARCHIVED_RECORD_NOT_FOUND", "Archived record not found");

    if (type === "users") {
      const restoreEmail = record.archived_email || (
        /^deleted-user-\d+@accounts\.invalid$/i.test(record.email) ? null : record.email
      );
      if (!restoreEmail) {
        throw AppError.conflict("ARCHIVED_LOGIN_EMAIL_MISSING", "This older archived login has no recoverable email. Update its email through account management before restoring it.");
      }
      const emailOwner = await User.findOne({
        where: { email: restoreEmail, is_deleted: 0 },
        attributes: ["id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (emailOwner && Number(emailOwner.id) !== recordId) {
        throw AppError.conflict("ARCHIVED_LOGIN_EMAIL_IN_USE", "Another active account now uses this email. Resolve the account conflict before restoring this login.");
      }
      await record.update({
        email: restoreEmail,
        archived_email: null,
        archived_is_active: null,
        is_deleted: 0,
        is_active: record.archived_is_active == null ? 1 : Number(record.archived_is_active),
        deleted_at: null,
        deleted_by: null,
        leadership_revision: Number(record.leadership_revision || 0) + 1,
      }, { transaction });
    } else if (type === "members") {
      const wasActive = record.archived_linked_user_active;
      await record.update({
        is_deleted: 0,
        deleted_at: null,
        deleted_by: null,
        archived_linked_user_active: null,
      }, { transaction });
      if (wasActive !== null && wasActive !== undefined) {
        await User.update(
          { is_active: Number(wasActive) ? 1 : 0 },
          { where: { member_id: record.id, is_deleted: 0 }, transaction },
        );
      }
    } else {
      await record.update({ is_deleted: 0, deleted_at: null, deleted_by: null }, { transaction });
    }

    const tableByType = {
      users: "users", members: "members", events: "events", services: "services",
      finance_records: "financial_records", cell_groups: "cell_groups",
      inventory_items: "inventory_items", ministry_roles: "ministry_roles",
      archive_categories: "archive_categories", finance_attachments: "attachments",
    };
    await auditLog.log({
      userId: restoredBy,
      action: "RESTORE_SYSTEM_ARCHIVE",
      targetTable: tableByType[type],
      targetId: recordId,
    }, { transaction });
    return { id: recordId, type, title: record.title || record.name || record.email || record.file_name || `Record #${recordId}` };
  });

  if (["events", "finance_records", "services", "inventory_items"].includes(type)) {
    cache.keys("dashboard:*").forEach((key) => cache.del(key));
  }
  return { message: `${source.label} restored successfully.`, record: result };
};
