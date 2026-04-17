"use strict";

const { Op } = require("sequelize");
const auditLog = require("../helpers/auditLog.helper");
const {
  ArchiveRecord,
  ArchiveCategory,
  ArchiveVersion,
  ArchiveAccessLog,
  User,
} = require("../models");

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
    required: false,
    include: [
      { model: User, as: "uploadedByUser", attributes: ["id", "email"], required: false },
    ],
  },
];

// ── Role visibility rules ────────────────────────────────────
// confidential  → System Admin, Pastor only
// restricted    → System Admin, Pastor, Finance Team, Registration Team
// public        → all roles
const ADMIN_PASTOR        = ["System Admin", "Pastor"];
const ADMIN_PASTOR_FINANCE = ["System Admin", "Pastor", "Finance Team", "Registration Team"];

const visibilityFilter = (roleName) => {
  if (ADMIN_PASTOR.includes(roleName)) return null;         // sees everything
  if (ADMIN_PASTOR_FINANCE.includes(roleName)) {
    return { [require("sequelize").Op.ne]: "confidential" }; // no confidential
  }
  // All other roles: public only
  return "public";
};

// ── Get All Records (paginated) ──────────────────────────────
exports.getAllRecords = async ({
  page = 1, limit = 15, category_id, status, visibility, search, roleName,
} = {}) => {
  const { Op } = require("sequelize");
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = { is_deleted: 0 };

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
    if (typeof roleVisibility === "object" && visibility === "confidential" && !ADMIN_PASTOR.includes(roleName)) {
      return { records: [], total: 0, total_pages: 0 };
    }
    where.visibility = visibility;
  } else if (roleVisibility !== null) {
    where.visibility = roleVisibility;
  }

  const { count, rows } = await ArchiveRecord.findAndCountAll({
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
exports.getRecordById = async (id) => {
  const record = await ArchiveRecord.findOne({
    where: { id },
    include: detailIncludes,
  });
  if (!record) throw { status: 404, message: "Archive record not found" };
  return remapRecord(record);
};

// ── Create Record ────────────────────────────────────────────
exports.createRecord = async (data, uploadedBy) => {
  const {
    category_id, title, description,
    file_url, file_type, file_size,
    document_date, visibility,
  } = data;

  const category = await ArchiveCategory.findByPk(category_id);
  if (!category) throw { status: 404, message: "Archive category not found" };

  const record = await ArchiveRecord.create({
    category_id,
    title,
    description:   description   || null,
    file_url,
    file_type,
    file_size:     file_size     || null,
    document_date: document_date || null,
    visibility:    visibility    || "public",
    status:        "pending",
    uploaded_by:   uploadedBy,
    approved_by:   null,
    is_deleted:    0,
  });

  // Create initial version
  await ArchiveVersion.create({
    record_id:      record.id,
    file_url,
    file_type,
    version_number: 1,
    uploaded_by:    uploadedBy,
  });

  const created = await exports.getRecordById(record.id);
  auditLog.log({ userId: uploadedBy, action: "UPLOAD_ARCHIVE", targetTable: "archive_records", targetId: created.id });
  return created;
};

// ── Update Record ────────────────────────────────────────────
exports.updateRecord = async (id, data, uploadedBy) => {
  const record = await ArchiveRecord.findOne({ where: { id } });
  if (!record) throw { status: 404, message: "Archive record not found" };

  if (record.status === "deleted")
    throw { status: 400, message: "Cannot update a deleted record" };

  const {
    category_id, title, description,
    file_url, file_type, file_size,
    document_date, visibility,
  } = data;

  if (category_id) {
    const category = await ArchiveCategory.findByPk(category_id);
    if (!category) throw { status: 404, message: "Archive category not found" };
  }

  // New file → create new version
  if (file_url && file_url !== record.file_url) {
    const lastVersion = await ArchiveVersion.findOne({
      where: { record_id: id },
      order: [["version_number", "DESC"]],
    });
    await ArchiveVersion.create({
      record_id:      id,
      file_url,
      file_type:      file_type || record.file_type,
      version_number: lastVersion ? lastVersion.version_number + 1 : 1,
      uploaded_by:    uploadedBy,
    });
  }

  await record.update({
    ...(category_id                && { category_id }),
    ...(title                      && { title }),
    ...(description  !== undefined && { description }),
    ...(file_url                   && { file_url }),
    ...(file_type                  && { file_type }),
    ...(file_size    !== undefined && { file_size }),
    ...(document_date !== undefined && { document_date }),
    ...(visibility                 && { visibility }),
    status:      "pending",
    approved_by: null,
  });

  auditLog.log({ userId: uploadedBy, action: "UPDATE_ARCHIVE", targetTable: "archive_records", targetId: id });
  return await exports.getRecordById(id);
};

// ── Approve Record ───────────────────────────────────────────
exports.approveRecord = async (id, approvedBy) => {
  const record = await ArchiveRecord.findOne({ where: { id } });
  if (!record) throw { status: 404, message: "Archive record not found" };

  if (record.status !== "pending")
    throw { status: 400, message: "Only pending records can be approved" };

  await record.update({ status: "approved", approved_by: approvedBy });
  auditLog.log({ userId: approvedBy, action: "APPROVE_ARCHIVE", targetTable: "archive_records", targetId: id });
  return await exports.getRecordById(id);
};

// ── Soft Delete Record ───────────────────────────────────────
exports.deleteRecord = async (id, deletedBy) => {
  const record = await ArchiveRecord.findOne({ where: { id } });
  if (!record) throw { status: 404, message: "Archive record not found" };

  await record.update({
    is_deleted: 1,
    deleted_at: new Date(),
    deleted_by: deletedBy,
    status:     "deleted",
  });

  auditLog.log({ userId: deletedBy, action: "DELETE_ARCHIVE", targetTable: "archive_records", targetId: id });
  return { message: "Archive record deleted successfully." };
};

// ── Get Versions for a Record ────────────────────────────────
exports.getVersions = async (recordId) => {
  const record = await ArchiveRecord.findOne({ where: { id: recordId } });
  if (!record) throw { status: 404, message: "Archive record not found" };

  return await ArchiveVersion.findAll({
    where: { record_id: recordId },
    include: [{ model: User, as: "uploadedByUser", attributes: ["id", "email"], required: false }],
    order: [["version_number", "DESC"]],
  });
};

// ── Log Access ───────────────────────────────────────────────
exports.logAccess = async (recordId, accessedBy, action) => {
  const record = await ArchiveRecord.findOne({ where: { id: recordId } });
  if (!record) throw { status: 404, message: "Archive record not found" };
  await ArchiveAccessLog.create({ record_id: recordId, accessed_by: accessedBy, action, accessed_at: new Date() });
  return record;
};

// ── Get Access Logs for a Record ─────────────────────────────
exports.getAccessLogs = async (recordId) => {
  const record = await ArchiveRecord.findOne({ where: { id: recordId } });
  if (!record) throw { status: 404, message: "Archive record not found" };

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
exports.getAllCategories = async () => {
  return await ArchiveCategory.findAll({ order: [["name", "ASC"]] });
};

exports.getCategoryById = async (id) => {
  const category = await ArchiveCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Archive category not found" };
  return category;
};

exports.createCategory = async (data) => {
  const { name, description } = data;
  const existing = await ArchiveCategory.findOne({ where: { name } });
  if (existing) throw { status: 409, message: "Category name already exists" };
  return await ArchiveCategory.create({ name, description: description || null });
};

exports.updateCategory = async (id, data) => {
  const category = await ArchiveCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Archive category not found" };
  const { name, description } = data;
  if (name && name !== category.name) {
    const existing = await ArchiveCategory.findOne({ where: { name } });
    if (existing) throw { status: 409, message: "Category name already exists" };
  }
  await category.update({ ...(name && { name }), ...(description !== undefined && { description }) });
  return category;
};

exports.deleteCategory = async (id) => {
  const category = await ArchiveCategory.findByPk(id);
  if (!category) throw { status: 404, message: "Archive category not found" };
  const inUse = await ArchiveRecord.count({ where: { category_id: id } });
  if (inUse > 0)
    throw { status: 400, message: `Cannot delete. ${inUse} record(s) are using this category` };
  await category.destroy();
  return { message: "Archive category deleted successfully." };
};
