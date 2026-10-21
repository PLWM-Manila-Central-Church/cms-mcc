"use strict";

const { Op }    = require("sequelize");
const sequelize = require("../config/db");
const auditLog  = require("../helpers/auditLog.helper");
const AppError  = require("../helpers/AppError");
const uploadStorage = require("../middlewares/upload-s3");
const {
  ARCHIVE_ADMIN_PASTOR,
  ARCHIVE_RESTRICTED_ALLOWED,
  canAccessArchiveRecord,
} = require("../helpers/archiveVisibility.helper");
const {
  ArchiveRecord,
  ArchiveCategory,
  ArchiveVersion,
  ArchiveAccessLog,
  User,
} = require("../models");

const FINANCE_ARCHIVE_CATEGORY = "Financial Records";

// Remap Sequelize aliases to the names the frontend expects
const remapRecord = (r) => {
  const plain = typeof r.toJSON === "function" ? r.toJSON() : r;
  plain.ArchiveCategory = plain.category       || null;
  plain.uploadedBy      = plain.uploadedByUser || null;
  plain.approvedBy      = plain.approvedByUser || null;
  if (Array.isArray(plain.ArchiveVersions)) {
    plain.ArchiveVersions = plain.ArchiveVersions.map((v) => ({
      ...v,
      versionUploadedBy: v.uploadedByUser || null,
    }));
  }
  return plain;
};

// Common includes for list view (lightweight)
const listIncludes = [
  { model: ArchiveCategory, as: "category",       attributes: ["id", "name"], required: false },
  { model: User,            as: "uploadedByUser", attributes: ["id", "email"], required: false },
];

// Full includes for detail view
const detailIncludes = [
  { model: ArchiveCategory, as: "category",       attributes: ["id", "name"], required: false },
  { model: User,            as: "uploadedByUser", attributes: ["id", "email"], required: false },
  { model: User,            as: "approvedByUser", attributes: ["id", "email"], required: false },
  {
    model: ArchiveVersion,
    as: "ArchiveVersions",
    required: false,
    include: [
      { model: User, as: "uploadedByUser", attributes: ["id", "email"], required: false },
    ],
  },
];

const visibilityFilter = (roleName) => {
  if (ARCHIVE_ADMIN_PASTOR.includes(roleName)) return null;         // sees everything
  if (ARCHIVE_RESTRICTED_ALLOWED.includes(roleName)) {
    return { [Op.ne]: "confidential" }; // no confidential
  }
  // All other roles: public only
  return "public";
};

// ── Get All Records (paginated) ──────────────────────────────
exports.getAllRecords = async ({
  page = 1, limit = 15, category_id, status, visibility, search, roleName, archived = false,
} = {}) => {

  const offset = (parseInt(page) - 1) * parseInt(limit);
  if (archived && roleName !== "System Admin") {
    return { records: [], total: 0, total_pages: 0 };
  }
  const where = { is_deleted: archived ? 1 : 0 };

  if (category_id) where.category_id = category_id;
  if (status)      where.status      = status;
  if (search)      where.title       = { [Op.like]: `%${search}%` };

  // Role-based visibility enforcement
  const roleVisibility = visibilityFilter(roleName);
  if (visibility) {
    // Requested filter must not exceed what role can see
    if (roleVisibility === "public" && visibility !== "public") {
      // Not allowed; return empty
      return { records: [], total: 0, total_pages: 0 };
    }
    if (typeof roleVisibility === "object" && visibility === "confidential" && !ARCHIVE_ADMIN_PASTOR.includes(roleName)) {
      return { records: [], total: 0, total_pages: 0 };
    }
    where.visibility = visibility;
  } else if (roleVisibility !== null) {
    where.visibility = roleVisibility;
  }

  if (roleName === "Finance Team") {
    const financialCategory = await ArchiveCategory.findOne({
      where: { name: "Financial Records", is_deleted: 0 },
      attributes: ["id"],
    });
    if (!financialCategory || (category_id && Number(category_id) !== Number(financialCategory.id))) {
      return { records: [], total: 0, total_pages: 0 };
    }
    where.category_id = financialCategory.id;
  }

  const RecordModel = archived ? ArchiveRecord.unscoped() : ArchiveRecord;
  const { count, rows } = await RecordModel.findAndCountAll({
    where,
    include: listIncludes,
    order: [["created_at", "DESC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  return {
    records:     rows.map(remapRecord),
    total:       count,
    total_pages: Math.ceil(count / parseInt(limit)),
  };
};

// ── Get Record By ID ─────────────────────────────────────────
exports.getRecordById = async (id, { includeArchived = false } = {}) => {
  const RecordModel = includeArchived ? ArchiveRecord.unscoped() : ArchiveRecord;
  const record = await RecordModel.findOne({
    where: { id },
    include: detailIncludes,
  });
  if (!record) throw AppError.notFound("RECORD_NOT_FOUND", "Archive record not found");
  return remapRecord(record);
};

exports.getRecordByIdForRole = async (id, roleName, { includeArchived = false } = {}) => {
  if (includeArchived && roleName !== "System Admin") {
    throw AppError.notFound("RECORD_NOT_FOUND", "Archive record not found");
  }
  const record = await exports.getRecordById(id, { includeArchived });
  if (!canAccessArchiveRecord(record, roleName)) {
    throw AppError.forbidden("Access forbidden");
  }
  return record;
};

const getRecordMetadataForRole = async (id, roleName) => {
  const record = await ArchiveRecord.findOne({
    where: { id },
    attributes: ["id", "visibility", "file_url", "file_type", "current_version_id"],
    include: [{ model: ArchiveCategory, as: "category", attributes: ["name"], required: false }],
  });
  if (!record) throw AppError.notFound("RECORD_NOT_FOUND", "Archive record not found");
  if (!canAccessArchiveRecord(record, roleName)) {
    throw AppError.forbidden("Access forbidden");
  }
  return record;
};

exports.assertStoredFileVisible = async (fileKey, roleName) => {
  const storageKey = uploadStorage.getStoredFileKey(fileKey, "archives");
  if (!storageKey) throw AppError.notFound("FILE_NOT_FOUND", "Archive file not found");

  const canonicalUrl = uploadStorage.getFileUrl(storageKey);
  const filename = storageKey.split("/").pop();
  const escapedFilename = filename.replace(/[\\%_]/g, "\\$&");
  const fileUrlMatch = () => ({
    [Op.or]: [
      { file_url: canonicalUrl },
      { file_url: { [Op.like]: `%/${escapedFilename}` } },
    ],
  });
  const [currentRecords, versions] = await Promise.all([
    ArchiveRecord.findAll({ where: fileUrlMatch(), attributes: ["id", "file_url"] }),
    ArchiveVersion.findAll({ where: fileUrlMatch(), attributes: ["record_id", "file_url"] }),
  ]);
  const recordIds = [...new Set([
    ...currentRecords
      .filter((record) => uploadStorage.getStoredFileKey(record.file_url, "archives") === storageKey)
      .map((record) => Number(record.id)),
    ...versions
      .filter((version) => uploadStorage.getStoredFileKey(version.file_url, "archives") === storageKey)
      .map((version) => Number(version.record_id)),
  ])];

  if (!recordIds.length) throw AppError.notFound("FILE_NOT_FOUND", "Archive file not found");

  const owners = await ArchiveRecord.findAll({
    where: { id: recordIds },
    attributes: ["id", "visibility", "category_id"],
    include: [{ model: ArchiveCategory, as: "category", attributes: ["name"], required: false }],
  });
  if (owners.length !== recordIds.length) {
    throw AppError.notFound("FILE_NOT_FOUND", "Archive file not found");
  }
  if (owners.some((record) => !canAccessArchiveRecord(record, roleName))) {
    throw AppError.forbidden("Access forbidden");
  }
  return storageKey;
};

// ── Create Record ────────────────────────────────────────────
exports.createRecord = async (data, uploadedBy) => {
  const {
    category_id, title, description,
    file_url, file_type, file_size,
    document_date, visibility,
  } = data;

  const category = await ArchiveCategory.findOne({ where: { id: category_id, is_deleted: 0 } });
  if (!category) throw AppError.notFound("CATEGORY_NOT_FOUND", "Archive category not found");

  const recordId = await sequelize.transaction(async (transaction) => {
    const record = await ArchiveRecord.create({
      category_id,
      title,
      description:   description   || null,
      file_url,
      file_type,
      file_size:     file_size     ?? null,
      document_date: document_date || null,
      visibility:    visibility    || "public",
      status:        "pending",
      uploaded_by:   uploadedBy,
      approved_by:   null,
      is_deleted:    0,
    }, { transaction });

    const version = await ArchiveVersion.create({
      record_id:      record.id,
      file_url,
      file_type,
      file_size:      file_size ?? null,
      version_number: 1,
      uploaded_by:    uploadedBy,
    }, { transaction });

    await record.update({ current_version_id: version.id }, { transaction });
    return record.id;
  });

  const created = await exports.getRecordById(recordId);
  auditLog.log({ userId: uploadedBy, action: "UPLOAD_ARCHIVE", targetTable: "archive_records", targetId: created.id });
  return created;
};

// ── Update Record ────────────────────────────────────────────
exports.updateRecord = async (id, data, uploadedBy) => {
  const record = await ArchiveRecord.findOne({ where: { id } });
  if (!record) throw AppError.notFound("RECORD_NOT_FOUND", "Archive record not found");

  if (record.status === "deleted")
    throw AppError.badRequest("DELETED_RECORD", "Cannot update a deleted record");

  const {
    category_id, title, description,
    file_url, file_type, file_size,
    document_date, visibility,
  } = data;

  if (category_id) {
    const category = await ArchiveCategory.findOne({ where: { id: category_id, is_deleted: 0 } });
    if (!category) throw AppError.notFound("CATEGORY_NOT_FOUND", "Archive category not found");
  }

  await sequelize.transaction(async (transaction) => {
    const lockedRecord = await ArchiveRecord.findOne({
      where: { id },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!lockedRecord) throw AppError.notFound("RECORD_NOT_FOUND", "Archive record not found");
    if (lockedRecord.status === "deleted") {
      throw AppError.badRequest("DELETED_RECORD", "Cannot update a deleted record");
    }

    const replacingFile = Boolean(file_url && file_url !== lockedRecord.file_url);
    let currentVersionId = lockedRecord.current_version_id;
    if (replacingFile) {
      const lastVersion = await ArchiveVersion.findOne({
        where: { record_id: id },
        order: [["version_number", "DESC"]],
        transaction,
      });
      const version = await ArchiveVersion.create({
        record_id:      id,
        file_url,
        file_type:      file_type || lockedRecord.file_type,
        file_size:      file_size ?? null,
        version_number: lastVersion ? lastVersion.version_number + 1 : 1,
        uploaded_by:    uploadedBy,
      }, { transaction });
      currentVersionId = version.id;
    }

    await lockedRecord.update({
      ...(category_id                && { category_id }),
      ...(title                      && { title }),
      ...(description  !== undefined && { description }),
      ...(file_url                   && { file_url }),
      ...(file_type                  && { file_type }),
      ...(file_size    !== undefined && { file_size }),
      ...(document_date !== undefined && { document_date }),
      ...(visibility                 && { visibility }),
      ...(replacingFile              && { current_version_id: currentVersionId }),
      status:      "pending",
      approved_by: null,
    }, { transaction });
  });

  auditLog.log({ userId: uploadedBy, action: "UPDATE_ARCHIVE", targetTable: "archive_records", targetId: id });
  return await exports.getRecordById(id);
};

// ── Approve Record ───────────────────────────────────────────
exports.approveRecord = async (id, approvedBy) => {
  const record = await ArchiveRecord.findOne({ where: { id } });
  if (!record) throw AppError.notFound("RECORD_NOT_FOUND", "Archive record not found");

  if (record.status !== "pending")
    throw AppError.badRequest("NOT_PENDING", "Only pending records can be approved");

  await record.update({ status: "approved", approved_by: approvedBy });
  auditLog.log({ userId: approvedBy, action: "APPROVE_ARCHIVE", targetTable: "archive_records", targetId: id });
  return await exports.getRecordById(id);
};

// ── Archive Record (retains the record, file, and version history) ──
exports.archiveRecord = async (id, archivedBy) => {
  const record = await ArchiveRecord.findOne({ where: { id } });
  if (!record) throw AppError.notFound("RECORD_NOT_FOUND", "Archive record not found");
  if (Number(record.is_deleted) === 1) {
    throw AppError.conflict("ALREADY_ARCHIVED", "This archive record is already archived");
  }

  await record.update({
    is_deleted: 1,
    deleted_at: new Date(),
    deleted_by: archivedBy,
  });

  auditLog.log({ userId: archivedBy, action: "ARCHIVE_RECORD", targetTable: "archive_records", targetId: id });
  return { message: "Archive record archived successfully." };
};

// Keep the old DELETE endpoint functional for older clients; it now archives.
exports.deleteRecord = exports.archiveRecord;

exports.restoreRecord = async (id, restoredBy) => {
  const record = await ArchiveRecord.unscoped().findOne({ where: { id } });
  if (!record) throw AppError.notFound("RECORD_NOT_FOUND", "Archive record not found");
  if (Number(record.is_deleted) !== 1) {
    throw AppError.conflict("NOT_ARCHIVED", "This archive record is already active");
  }

  // Older soft-deleted rows stored their previous approval state as `deleted`.
  const restoredStatus = record.status === "deleted"
    ? (record.approved_by ? "approved" : "pending")
    : record.status;
  await record.update({
    is_deleted: 0,
    deleted_at: null,
    deleted_by: null,
    status: restoredStatus,
  });
  auditLog.log({
    userId: restoredBy,
    action: "RESTORE_ARCHIVE",
    targetTable: "archive_records",
    targetId: id,
    newValues: { status: restoredStatus },
  });
  return { message: "Archive record restored successfully." };
};

// ── Get Versions for a Record ────────────────────────────────
exports.getVersions = async (recordId, roleName) => {
  await getRecordMetadataForRole(recordId, roleName);

  return await ArchiveVersion.findAll({
    where: { record_id: recordId },
    include: [{ model: User, as: "uploadedByUser", attributes: ["id", "email"], required: false }],
    order: [["version_number", "DESC"]],
  });
};

exports.getDownloadFile = async (recordId, versionId, roleName) => {
  const record = await getRecordMetadataForRole(recordId, roleName);
  let version = null;
  if (versionId != null) {
    version = await ArchiveVersion.findOne({
      where: { id: versionId, record_id: recordId },
    });
    if (!version) throw AppError.notFound("VERSION_NOT_FOUND", "Archive version not found");
  }

  const fileUrl = version?.file_url || record.file_url;
  const storageKey = uploadStorage.getStoredFileKey(fileUrl, "archives");
  if (!storageKey) throw AppError.notFound("FILE_NOT_FOUND", "Archive file not found");
  return { storageKey, fileType: version?.file_type || record.file_type };
};

// ── Log Access ───────────────────────────────────────────────
exports.logAccess = async (recordId, accessedBy, action, roleName) => {
  const record = await getRecordMetadataForRole(recordId, roleName);
  await ArchiveAccessLog.create({ record_id: recordId, accessed_by: accessedBy, action, accessed_at: new Date() });
  return record;
};

// ── Get Access Logs for a Record ─────────────────────────────
exports.getAccessLogs = async (recordId, roleName) => {
  await getRecordMetadataForRole(recordId, roleName);

  const logs = await ArchiveAccessLog.findAll({
    where: { record_id: recordId },
    include: [{ model: User, as: "accessedByUser", attributes: ["id", "email"], required: false }],
    order: [["accessed_at", "DESC"]],
  });

  // Remap alias for frontend
  return logs.map((l) => {
    const plain = l.toJSON();
    plain.accessedBy = plain.accessedByUser || null;
    return plain;
  });
};

// ── Categories ───────────────────────────────────────────────
exports.getAllCategories = async (roleName) => {
  const where = roleName === "Finance Team"
    ? { name: FINANCE_ARCHIVE_CATEGORY, is_deleted: 0 }
    : { is_deleted: 0 };
  return await ArchiveCategory.findAll({ where, order: [["name", "ASC"]] });
};

exports.getCategoryById = async (id, roleName) => {
  const category = await ArchiveCategory.findOne({ where: { id, is_deleted: 0 } });
  if (!category) throw AppError.notFound("CATEGORY_NOT_FOUND", "Archive category not found");
  if (roleName === "Finance Team" && category.name !== FINANCE_ARCHIVE_CATEGORY) {
    throw AppError.notFound("CATEGORY_NOT_FOUND", "Archive category not found");
  }
  return category;
};

exports.createCategory = async (data) => {
  const { name, description } = data;
  const existing = await ArchiveCategory.findOne({ where: { name } });
  if (existing) throw AppError.conflict("DUPLICATE_NAME", "Category name already exists");
  return await ArchiveCategory.create({ name, description: description || null });
};

exports.updateCategory = async (id, data) => {
  const category = await ArchiveCategory.findOne({ where: { id, is_deleted: 0 } });
  if (!category) throw AppError.notFound("CATEGORY_NOT_FOUND", "Archive category not found");
  const { name, description } = data;
  if (category.name === FINANCE_ARCHIVE_CATEGORY && name && name !== category.name) {
    throw AppError.badRequest("CATEGORY_RESERVED", "The Financial Records category name is required for Finance Team uploads.");
  }
  if (name && name !== category.name) {
    const existing = await ArchiveCategory.findOne({ where: { name } });
    if (existing) throw AppError.conflict("DUPLICATE_NAME", "Category name already exists");
  }
  await category.update({ ...(name && { name }), ...(description !== undefined && { description }) });
  return category;
};

exports.archiveCategory = async (id, deletedBy) => {
  const category = await ArchiveCategory.findOne({ where: { id, is_deleted: 0 } });
  if (!category) throw AppError.notFound("CATEGORY_NOT_FOUND", "Archive category not found");
  if (category.name === FINANCE_ARCHIVE_CATEGORY) {
    throw AppError.badRequest("CATEGORY_RESERVED", "The Financial Records category is required for Finance Team uploads.");
  }
  const inUse = await ArchiveRecord.count({ where: { category_id: id } });
  if (inUse > 0)
    throw AppError.badRequest("CATEGORY_IN_USE", `Cannot archive. ${inUse} record${inUse === 1 ? " is" : "s are"} using this category`);
  await category.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: deletedBy });
  auditLog.log({ userId: deletedBy, action: "ARCHIVE_CATEGORY", targetTable: "archive_categories", targetId: id });
  return { message: "Archive category archived successfully." };
};
exports.deleteCategory = exports.archiveCategory;
