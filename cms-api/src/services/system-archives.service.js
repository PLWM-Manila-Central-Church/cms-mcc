"use strict";

const { Op, QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const auditLog = require("../helpers/auditLog.helper");
const AppError = require("../helpers/AppError");
const cache = require("../helpers/cache.helper");
const { getAttendanceModel, syncServiceAttendanceSummary } = require("../helpers/attendanceSummary.helper");
const { invalidateServiceFinalization } = require("../modules/qr-attendance/reconciliation.service");
const {
  User,
  Member,
  Event,
  Service,
  Attendance,
  FinancialRecord,
  Fund,
  Account,
  ExpenseCategory,
  Expense,
  PaymentMethod,
  CellGroup,
  InventoryItem,
  MinistryRole,
  ArchiveCategory,
  Attachment,
  Notification,
  EmergencyContact,
  MinistryAssignment,
  MinistryMembership,
  EventImageArchive,
} = require("../models");
const { AttendanceBatchItem } = require("../modules/qr-attendance/models");

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
  funds: { label: "Finance fund", table: "funds", model: Fund, title: "name" },
  accounts: { label: "Finance account", table: "accounts", model: Account, title: "name" },
  expense_categories: { label: "Expense category", table: "expense_categories", model: ExpenseCategory, title: "category_name" },
  expenses: {
    label: "Expense record", table: "expenses", model: Expense,
    title: "CONCAT('Expense #', id, ' — ', date, ' — PHP ', amount)",
  },
  cell_groups: { label: "Cell group", table: "cell_groups", model: CellGroup, title: "name" },
  inventory_items: { label: "Inventory item", table: "inventory_items", model: InventoryItem, title: "name" },
  ministry_roles: { label: "Ministry role", table: "ministry_roles", model: MinistryRole, title: "name" },
  archive_categories: { label: "Archive category", table: "archive_categories", model: ArchiveCategory, title: "name" },
  finance_attachments: { label: "Receipt attachment", table: "attachments", model: Attachment, title: "file_name" },
  notifications: {
    label: "Notification",
    table: "notifications",
    model: Notification,
    selectSql: "SELECT 'notifications' AS entity_type, 'Notification' AS entity_label, n.id AS entity_id, CONCAT('Notification #', n.id, ' — ', n.type) AS title, n.deleted_at AS archived_at, n.deleted_by AS archived_by FROM notifications n WHERE n.is_deleted = 1",
  },
  emergency_contacts: {
    label: "Emergency contact",
    table: "emergency_contacts",
    model: EmergencyContact,
    selectSql: "SELECT 'emergency_contacts' AS entity_type, 'Emergency contact' AS entity_label, c.id AS entity_id, CONCAT('Emergency contact for ', TRIM(CONCAT(m.first_name, ' ', m.last_name)), ' — ', c.name) AS title, c.deleted_at AS archived_at, c.deleted_by AS archived_by FROM emergency_contacts c LEFT JOIN members m ON m.id = c.member_id WHERE c.is_deleted = 1",
  },
  ministry_assignments: {
    label: "Ministry assignment",
    table: "ministry_assignments",
    model: MinistryAssignment,
    selectSql: "SELECT 'ministry_assignments' AS entity_type, 'Ministry assignment' AS entity_label, a.id AS entity_id, CONCAT(TRIM(CONCAT(m.first_name, ' ', m.last_name)), ' — ', COALESCE(r.name, 'Ministry'), ' — ', COALESCE(s.title, 'Service')) AS title, a.deleted_at AS archived_at, a.deleted_by AS archived_by FROM ministry_assignments a LEFT JOIN members m ON m.id = a.member_id LEFT JOIN ministry_roles r ON r.id = a.ministry_role_id LEFT JOIN services s ON s.id = a.service_id WHERE a.is_deleted = 1",
  },
  ministry_memberships: {
    label: "Ministry membership",
    table: "ministry_memberships",
    model: MinistryMembership,
    selectSql: "SELECT 'ministry_memberships' AS entity_type, 'Ministry membership' AS entity_label, mm.id AS entity_id, CONCAT(TRIM(CONCAT(m.first_name, ' ', m.last_name)), ' — ', COALESCE(r.name, 'Ministry')) AS title, mm.deleted_at AS archived_at, mm.deleted_by AS archived_by FROM ministry_memberships mm LEFT JOIN members m ON m.id = mm.member_id LEFT JOIN ministry_roles r ON r.id = mm.ministry_role_id WHERE mm.is_deleted = 1",
  },
  attendance_batch_items: {
    label: "Draft attendance attendee",
    table: "attendance_batch_items",
    model: AttendanceBatchItem,
    selectSql: "SELECT 'attendance_batch_items' AS entity_type, 'Draft attendance attendee' AS entity_label, i.id AS entity_id, CONCAT('QR batch attendee — ', COALESCE(NULLIF(TRIM(CONCAT(m.first_name, ' ', m.last_name)), ''), CONCAT('Member #', i.member_id)), ' — batch #', i.batch_id) AS title, i.deleted_at AS archived_at, i.deleted_by AS archived_by FROM attendance_batch_items i LEFT JOIN members m ON m.id = i.member_id WHERE i.is_deleted = 1",
  },
  event_images: {
    label: "Event image",
    table: "event_image_archives",
    model: EventImageArchive,
    selectSql: "SELECT 'event_images' AS entity_type, 'Event image' AS entity_label, i.id AS entity_id, CONCAT('Image — ', COALESCE(e.title, CONCAT('Event #', i.event_id))) AS title, i.deleted_at AS archived_at, i.deleted_by AS archived_by FROM event_image_archives i LEFT JOIN events e ON e.id = i.event_id WHERE i.is_deleted = 1",
  },
  attendance_records: {
    label: "Service check-in",
    selectSql: "SELECT 'attendance_records' AS entity_type, 'Service check-in' AS entity_label, a.id AS entity_id, CONCAT('Service check-in #', a.id, ' — ', COALESCE(NULLIF(TRIM(CONCAT(m.first_name, ' ', m.last_name)), ''), CONCAT('Member #', a.member_id)), ' — ', COALESCE(s.title, CONCAT('Service #', a.service_id))) AS title, a.voided_at AS archived_at, a.voided_by AS archived_by FROM attendances a LEFT JOIN members m ON m.id = a.member_id LEFT JOIN services s ON s.id = a.service_id WHERE a.entry_source = 'legacy' AND a.check_in_method <> 'pre-reg' AND a.voided_at IS NOT NULL",
  },
});

const getUnionSql = (sourceTypes = Object.keys(SOURCES)) => sourceTypes.map((type) => {
  const source = SOURCES[type];
  if (source.selectSql) return source.selectSql;
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

  if (type === "attendance_records") {
    const AttendanceModel = await getAttendanceModel();
    if (AttendanceModel === Attendance) {
      throw new AppError("ATTENDANCE_ARCHIVE_SCHEMA_REQUIRED", 503, "Attendance restoration is unavailable until the attendance audit fields are installed.");
    }
    const result = await sequelize.transaction(async (transaction) => {
      const record = await AttendanceModel.findOne({
        where: { id: recordId, entry_source: "legacy", voided_at: { [Op.ne]: null }, check_in_method: { [Op.ne]: "pre-reg" } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!record) throw AppError.notFound("ARCHIVED_RECORD_NOT_FOUND", "Archived service check-in was not found");
      const before = {
        voided_at: record.voided_at,
        voided_by: record.voided_by,
        void_reason: record.void_reason,
      };
      await record.update({ voided_at: null, voided_by: null, void_reason: null }, { transaction });
      await invalidateServiceFinalization(record.service_id, {
        transaction,
        actorId: restoredBy,
        reason: "legacy_service_check_in_restored",
      });
      await syncServiceAttendanceSummary(record.service_id, transaction);
      await auditLog.log({
        userId: restoredBy,
        action: "RESTORE_SYSTEM_ARCHIVE",
        targetTable: "attendances",
        targetId: recordId,
        oldValues: before,
        newValues: { voided_at: null, voided_by: null, void_reason: null },
      }, { transaction });
      return { id: recordId, type, title: `Service check-in #${recordId}` };
    });
    cache.keys("dashboard:*").forEach((key) => cache.del(key));
    return { message: `${source.label} restored successfully.`, record: result };
  }

  if (type === "event_images") {
    const result = await sequelize.transaction(async (transaction) => {
      const archivedImage = await EventImageArchive.unscoped().findOne({
        where: { id: recordId, is_deleted: 1 }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!archivedImage) throw AppError.notFound("ARCHIVED_RECORD_NOT_FOUND", "Archived event image was not found");
      const event = await Event.findOne({
        where: { id: archivedImage.event_id, is_deleted: 0 }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!event) throw AppError.conflict("EVENT_NOT_ACTIVE", "Restore the event before restoring its image");
      if (event.image_url || event.image_key) {
        await EventImageArchive.create({
          event_id: event.id,
          image_key: event.image_key,
          image_url: event.image_url,
          created_by: restoredBy,
          is_deleted: 1,
          deleted_at: new Date(),
          deleted_by: restoredBy,
        }, { transaction });
      }
      await event.update({ image_key: archivedImage.image_key, image_url: archivedImage.image_url }, { transaction });
      await archivedImage.update({ is_deleted: 0, deleted_at: null, deleted_by: null }, { transaction });
      await auditLog.log({ userId: restoredBy, action: "RESTORE_EVENT_IMAGE", targetTable: "events", targetId: event.id }, { transaction });
      return { id: recordId, type, title: `Image — ${event.title}` };
    });
    return { message: "Event image restored successfully.", record: result };
  }

  if (type === "attendance_batch_items") {
    const result = await sequelize.transaction(async (transaction) => {
      const item = await AttendanceBatchItem.unscoped().findOne({
        where: { id: recordId, is_deleted: 1 }, transaction, lock: transaction.LOCK.UPDATE,
      });
      if (!item) throw AppError.notFound("ARCHIVED_RECORD_NOT_FOUND", "Archived draft attendee was not found");
      const { AttendanceBatch } = require("../modules/qr-attendance/models");
      const batch = await AttendanceBatch.findByPk(item.batch_id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!batch || batch.state !== "draft") throw AppError.conflict("BATCH_NOT_DRAFT", "A draft attendee can only be restored while its batch is still a draft");
      const member = await Member.findOne({ where: { id: item.member_id, is_deleted: 0 }, transaction });
      if (!member) throw AppError.conflict("MEMBER_NOT_ACTIVE", "Restore the member profile before restoring this draft attendee");
      const duplicate = await AttendanceBatchItem.findOne({ where: { batch_id: item.batch_id, member_id: item.member_id }, transaction });
      if (duplicate) throw AppError.conflict("BATCH_ITEM_EXISTS", "This member is already in the draft batch");
      await item.update({ is_deleted: 0, deleted_at: null, deleted_by: null }, { transaction });
      await batch.update({ revision: Number(batch.revision) + 1 }, { transaction });
      await auditLog.log({ userId: restoredBy, action: "RESTORE_SYSTEM_ARCHIVE", targetTable: "attendance_batch_items", targetId: recordId }, { transaction });
      return { id: recordId, type, title: `QR batch attendee #${recordId}` };
    });
    return { message: "Draft attendee restored successfully.", record: result };
  }

  const result = await sequelize.transaction(async (transaction) => {
    const record = await source.model.unscoped().findOne({
      where: { id: recordId, is_deleted: 1 },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!record) throw AppError.notFound("ARCHIVED_RECORD_NOT_FOUND", "Archived record not found");

    if (type === "ministry_memberships") {
      const member = await Member.findOne({ where: { id: record.member_id, is_deleted: 0 }, transaction });
      const ministryRole = await MinistryRole.findOne({ where: { id: record.ministry_role_id, is_deleted: 0 }, transaction });
      if (!member || !ministryRole) throw AppError.conflict("MINISTRY_MEMBERSHIP_PARENT_INACTIVE", "Restore the member and ministry role before restoring this membership");
      const duplicate = await MinistryMembership.findOne({ where: { ministry_role_id: record.ministry_role_id, member_id: record.member_id }, transaction });
      if (duplicate) throw AppError.conflict("MINISTRY_MEMBERSHIP_EXISTS", "This member is already in the ministry roster");
    }

    if (type === "ministry_assignments") {
      const service = await Service.findOne({ where: { id: record.service_id, is_deleted: 0 }, transaction });
      const member = await Member.findOne({ where: { id: record.member_id, is_deleted: 0 }, transaction });
      const ministryRole = await MinistryRole.findOne({ where: { id: record.ministry_role_id, is_deleted: 0 }, transaction });
      if (!service || !member || !ministryRole) throw AppError.conflict("MINISTRY_ASSIGNMENT_PARENT_INACTIVE", "Restore the service, member, and ministry role before restoring this assignment");
      const duplicate = await MinistryAssignment.findOne({ where: { service_id: record.service_id, member_id: record.member_id, is_deleted: 0 }, transaction });
      if (duplicate) throw AppError.conflict("MINISTRY_ASSIGNMENT_EXISTS", "This person already has an assignment for the service");
    }

    if (type === "accounts") {
      const fund = await Fund.findOne({ where: { id: record.fund_id, is_deleted: 0 }, transaction });
      if (!fund) throw AppError.conflict("FINANCE_PARENT_INACTIVE", "Restore the finance fund before restoring this account");
    }

    if (type === "expense_categories") {
      if (record.account_id) {
        const account = await Account.findOne({ where: { id: record.account_id, is_deleted: 0 }, transaction });
        if (!account) throw AppError.conflict("FINANCE_PARENT_INACTIVE", "Restore the finance account before restoring this expense category");
      }
    }

    if (type === "expenses") {
      const [category, account, paymentMethod] = await Promise.all([
        ExpenseCategory.findOne({ where: { id: record.category_id, is_deleted: 0 }, transaction }),
        record.account_id ? Account.findOne({ where: { id: record.account_id, is_deleted: 0 }, transaction }) : Promise.resolve(null),
        PaymentMethod.findByPk(record.payment_method_id, { transaction }),
      ]);
      if (!category || !paymentMethod || (record.account_id && !account)) {
        throw AppError.conflict("FINANCE_PARENT_INACTIVE", "Restore the expense category and payment method before restoring this expense");
      }
      if (record.account_id && category.account_id && Number(category.account_id) !== Number(record.account_id)) {
        throw AppError.conflict("EXPENSE_ACCOUNT_MISMATCH", "The expense no longer matches its category account; correct the category or expense before restoring it");
      }
    }

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
      finance_records: "financial_records", funds: "funds", accounts: "accounts",
      expense_categories: "expense_categories", expenses: "expenses", cell_groups: "cell_groups",
      inventory_items: "inventory_items", ministry_roles: "ministry_roles",
      archive_categories: "archive_categories", finance_attachments: "attachments",
      notifications: "notifications", emergency_contacts: "emergency_contacts",
      ministry_assignments: "ministry_assignments", ministry_memberships: "ministry_memberships",
      attendance_batch_items: "attendance_batch_items",
    };
    await auditLog.log({
      userId: restoredBy,
      action: "RESTORE_SYSTEM_ARCHIVE",
      targetTable: tableByType[type],
      targetId: recordId,
    }, { transaction });
    return { id: recordId, type, title: record.title || record.name || record.email || record.file_name || `Record #${recordId}` };
  });

  if (["events", "finance_records", "funds", "accounts", "expense_categories", "expenses", "services", "inventory_items"].includes(type)) {
    cache.keys("dashboard:*").forEach((key) => cache.del(key));
  }
  return { message: `${source.label} restored successfully.`, record: result };
};
