"use strict";

const { Op } = require("sequelize");
const sequelize = require("../config/db");
const { Member, MemberStatusHistory, CellGroup, MinistryGroup, EmergencyContact, User, Role,
  MinistryMembership, RefreshToken, PasswordResetToken, UserSession } = require("../models");
const cache    = require("../helpers/cache.helper");
const auditLog = require("../helpers/auditLog.helper");
const logger   = require("../helpers/logger");
const AppError = require("../helpers/AppError");
const {
  applyMemberScope,
  ensureMemberInScope,
  filterMemberUpdateForScopedLeader,
  getScope,
  isScopedLeader,
  requireLeaderScope,
} = require("../helpers/scopedLeader.helper");

const memberIncludes = [
  {
    model: CellGroup,
    as: "cellGroup",
    attributes: ["id", "name", "area"],
    required: false,
  },
  {
    model: MinistryGroup,
    as: "group",
    attributes: ["id", "name"],
    required: false,
  },
];

const memberSearchAttributes = [
  "id",
  "first_name",
  "last_name",
  "email",
  "phone",
  "birthdate",
  "spiritual_birthday",
  "status",
  "cell_group_id",
  "group_id",
  "barcode",
];

const calcAge = (dateValue) => {
  if (!dateValue) return null;
  const birth = new Date(dateValue);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const monthDelta = now.getMonth() - birth.getMonth();
  if (monthDelta < 0 || (monthDelta === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age >= 0 ? age : null;
};

const isYoungAdultsGroup = (name = "") => /(^|\b)(ya|young adult|young adults)(\b|$)/i.test(name);

const dateOnly = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const youngAdultBirthdateRange = () => {
  const today = new Date();
  const latest = new Date(today);
  latest.setFullYear(today.getFullYear() - 18);

  const earliest = new Date(today);
  earliest.setFullYear(today.getFullYear() - 30);
  earliest.setDate(earliest.getDate() + 1);

  return {
    [Op.between]: [dateOnly(earliest), dateOnly(latest)],
  };
};

const ensureScopeForAssignment = (user = {}) => {
  if (user.roleName === "Leader") return requireLeaderScope(user);
  const scope = getScope(user);
  return scope;
};

const buildSearchWhere = (search = "") => {
  const where = { is_deleted: 0 };
  const trimmed = String(search || "").trim();
  if (trimmed) {
    const like = `%${trimmed}%`;
    where[Op.or] = [
      { first_name: { [Op.like]: like } },
      { last_name:  { [Op.like]: like } },
      { email:      { [Op.like]: like } },
      { phone:      { [Op.like]: like } },
      { barcode:    { [Op.like]: like } },
    ];
  }
  return where;
};

const getGroupForScope = async (scope, { transaction } = {}) => {
  if (scope.type !== "group") return null;
  const group = await MinistryGroup.findByPk(scope.id, { attributes: ["id", "name"], ...(transaction && { transaction }) });
  if (!group) throw AppError.notFound("RECORD_NOT_FOUND", "Assigned group not found");
  return group;
};

const assertGroupEligibility = (member, group) => {
  if (!group || !isYoungAdultsGroup(group.name)) return;
  const age = calcAge(member.birthdate);
  if (age === null || age < 18 || age > 29) {
    throw AppError.badRequest("VALIDATION", "YA members must be age 18 to 29 and unassigned to any group");
  }
};

// ── Get All Members (paginated) ──────────────────────────────
exports.getAllMembers = async ({ page = 1, limit = 20, search, status, cell_group_id, group_id } = {}, user = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = { is_deleted: 0 };

  await applyMemberScope(where, user);

  // Role-based scoping — restrict what the caller can see
  // Role IDs: 5 = Cell Group Leader, 6 = Group Leader
  // Ministry Leader = role_name === 'Ministry Leader' with leadsMinistryId set
  // All other roles (System Admin=1, Pastor=2, Finance=4, Member=7) see all members

  // Query filters (applied on top of scope)
  if (status)        where.status        = status;
  if (cell_group_id && !where.cell_group_id) where.cell_group_id = parseInt(cell_group_id);
  if (group_id      && !where.group_id)      where.group_id      = parseInt(group_id);

  if (search) {
    const like = `%${search}%`;
    where[Op.or] = [
      { first_name: { [Op.like]: like } },
      { last_name:  { [Op.like]: like } },
      { email:      { [Op.like]: like } },
      { phone:      { [Op.like]: like } },
      { barcode:    { [Op.like]: like } },
    ];
  }

  const { count, rows } = await Member.findAndCountAll({
    where,
    include: memberIncludes,
    // Stable primary-key tiebreaking prevents overlapping/skipped rows when
    // duplicate names land on adjacent pagination boundaries.
    order: [["last_name", "ASC"], ["first_name", "ASC"], ["id", "ASC"]],
    limit: parseInt(limit),
    offset,
    distinct: true,
  });

  return {
    members:     rows,
    total:       count,
    total_pages: Math.ceil(count / parseInt(limit)),
  };
};

// ── Get Member By ID ─────────────────────────────────────────
exports.getMemberById = async (id, user = {}) => {
  await ensureMemberInScope(id, user);
  const member = await Member.findOne({
    where: { id },
    include: [
      ...memberIncludes,
      { model: EmergencyContact, as: "emergencyContacts", required: false },
    ],
  });
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");
  return member;
};

exports.getMemberStatusHistory = async (id, user = {}) => {
  const member = await exports.getMemberById(id, user);
  const history = await MemberStatusHistory.findAll({
    where: { member_id: member.id },
    attributes: ["id", "old_status", "new_status", "reason", "created_at"],
    include: [{
      model: User,
      as: "changedByUser",
      attributes: ["id", "email"],
      required: false,
    }],
    order: [["created_at", "DESC"], ["id", "DESC"]],
    limit: 50,
  });

  return history.map((record) => ({
    id: record.id,
    old_status: record.old_status,
    new_status: record.new_status,
    reason: record.reason,
    changed_at: record.createdAt || record.getDataValue("createdAt") || record.getDataValue("created_at"),
    changed_by: record.changedByUser?.email || null,
  }));
};

// ── Create Member ────────────────────────────────────────────
const constrainMemberCreateToScope = (data = {}, user = {}) => {
  if (!isScopedLeader(user)) return data;

  const scope = getScope(user);
  if (!scope || !Number.isSafeInteger(Number(scope.id)) || Number(scope.id) < 1) {
    throw AppError.forbidden("This account has no active member-creation scope");
  }

  if (scope.type === "cell_group") {
    if (Number(data.cell_group_id) !== Number(scope.id)) {
      throw AppError.forbidden("Members must be created inside your assigned cell group");
    }
    return { ...data, group_id: null };
  }

  if (scope.type === "group") {
    if (Number(data.group_id) !== Number(scope.id)) {
      throw AppError.forbidden("Members must be created inside your assigned group");
    }
    return { ...data, cell_group_id: null };
  }

  if (scope.type === "ministry") {
    if (data.ministry_role_id && Number(data.ministry_role_id) !== Number(scope.id)) {
      throw AppError.forbidden("Members can only be enrolled in your assigned ministry");
    }
    return { ...data, cell_group_id: null, group_id: null, ministry_role_id: scope.id };
  }

  throw AppError.forbidden("Select one assigned team before creating a member");
};

const rollbackNewMember = async (memberId) => {
  await MemberStatusHistory.destroy({ where: { member_id: memberId } }).catch(() => {});
  await Member.destroy({ where: { id: memberId }, force: true }).catch(() => {});
};

exports.createMember = async (data, createdBy, user = {}, importedStatus = null) => {
  data = constrainMemberCreateToScope(data, user);
  const {
    first_name, last_name, email, phone, birthdate, spiritual_birthday,
    address, gender, status, cell_group_id, group_id, referred_by,
    profile_photo_url, barcode, ministry_role_id,
  } = data;

  if (email) {
    const existing = await Member.findOne({ where: { email } });
    if (existing) throw AppError.conflict("DUPLICATE", "Email already in use");
  }

  if (barcode) {
    const existing = await Member.findOne({ where: { barcode } });
    if (existing) throw AppError.conflict("DUPLICATE", "Barcode already in use");
  }

  if (cell_group_id) {
    const cellGroup = await CellGroup.findByPk(cell_group_id);
    if (!cellGroup) throw AppError.notFound("RECORD_NOT_FOUND", "Cell group not found");
  }

  if (group_id) {
    const group = await MinistryGroup.findByPk(group_id);
    if (!group) throw AppError.notFound("RECORD_NOT_FOUND", "Group not found");
  }

  const member = await Member.create({
    first_name,
    last_name,
    email:              email              || null,
    phone:              phone              || null,
    birthdate:          birthdate          || null,
    spiritual_birthday: spiritual_birthday || null,
    address:            address            || null,
    gender:             gender             || null,
    status:             status             || "Active",
    cell_group_id:      cell_group_id      || null,
    group_id:           group_id           || null,
    referred_by:        referred_by        || null,
    profile_photo_url:  profile_photo_url  || null,
    barcode:            barcode            || null,
    is_deleted: 0,
  });

  if (importedStatus && importedStatus !== member.status) {
    try {
      await MemberStatusHistory.create({
        member_id: member.id,
        old_status: importedStatus,
        new_status: member.status,
        changed_by: createdBy || null,
        reason: `Source roster status normalized to ${member.status} under the current member-status policy.`,
      });
    } catch (error) {
      await rollbackNewMember(member.id);
      throw error;
    }
  }

  let created;
  try {
    created = await exports.getMemberById(member.id, user);
  } catch (error) {
    await rollbackNewMember(member.id);
    throw error;
  }

  // Auto-enroll into ministry:
  // 1. If an explicit ministry_role_id was passed in the form, use that.
  // 2. Otherwise, if the creator is a Ministry Leader, use their ministry.
  const { roleName, leadsMinistryId } = user;
  const enrollRoleId = ministry_role_id
    ? parseInt(ministry_role_id)
    : (roleName === 'Ministry Leader' && leadsMinistryId ? leadsMinistryId : null);

  if (enrollRoleId) {
    try {
      await MinistryMembership.findOrCreate({
        where: { ministry_role_id: enrollRoleId, member_id: member.id },
        defaults: { ministry_role_id: enrollRoleId, member_id: member.id, added_by: createdBy },
      });
    } catch (err) {
      logger.error(err, "Ministry auto-enroll failed:")
    }
  }

  auditLog.log({ userId: createdBy, action: "CREATE_MEMBER", targetTable: "members", targetId: created.id });
    cache.keys("dashboard:*").forEach(k => cache.del(k));
    return created;
};

// ── Update Member ────────────────────────────────────────────
exports.updateMember = async (id, data, updatedBy, user = {}) => {
  await ensureMemberInScope(id, user);
  data = filterMemberUpdateForScopedLeader(data, user);
  if (Object.keys(data).length === 0) {
    throw AppError.badRequest("VALIDATION", "No allowed member fields to update");
  }

  const member = await Member.findOne({ where: { id } });
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  const {
    first_name, last_name, email, phone, birthdate, spiritual_birthday,
    address, gender, status, cell_group_id, group_id, referred_by,
    profile_photo_url, barcode,
  } = data;

  if (email && email !== member.email) {
    const existing = await Member.findOne({ where: { email } });
    if (existing) throw AppError.conflict("DUPLICATE", "Email already in use");
  }

  if (barcode && barcode !== member.barcode) {
    const existing = await Member.findOne({ where: { barcode } });
    if (existing) throw AppError.conflict("DUPLICATE", "Barcode already in use");
  }

  if (cell_group_id) {
    const cellGroup = await CellGroup.findByPk(cell_group_id);
    if (!cellGroup) throw AppError.notFound("RECORD_NOT_FOUND", "Cell group not found");
  }

  if (group_id) {
    const group = await MinistryGroup.findByPk(group_id);
    if (!group) throw AppError.notFound("RECORD_NOT_FOUND", "Group not found");
  }

  const statusChanged = status !== undefined && status !== member.status;
  const oldStatus = member.status;
  await sequelize.transaction(async (transaction) => {
    await member.update({
    ...(first_name          && { first_name }),
    ...(last_name           && { last_name }),
    ...(email               !== undefined && { email }),
    ...(phone               !== undefined && { phone }),
    ...(birthdate           !== undefined && { birthdate }),
    ...(spiritual_birthday  !== undefined && { spiritual_birthday }),
    ...(address             !== undefined && { address }),
    ...(gender              !== undefined && { gender }),
    ...(status              !== undefined && { status }),
    ...(cell_group_id       !== undefined && { cell_group_id }),
    ...(group_id            !== undefined && { group_id }),
    ...(referred_by         !== undefined && { referred_by }),
    ...(profile_photo_url   !== undefined && { profile_photo_url }),
    ...(barcode             !== undefined && { barcode }),
    }, { transaction });
    if (statusChanged) {
      await MemberStatusHistory.create({
        member_id: id,
        old_status: oldStatus,
        new_status: status,
        changed_by: updatedBy,
        reason: "Member status changed through the member record form.",
      }, { transaction });
    }
    await auditLog.log({ userId: updatedBy, action: "UPDATE_MEMBER", targetTable: "members", targetId: id }, { transaction });
  });
  cache.keys("dashboard:*").forEach(k => cache.del(k));
  return await exports.getMemberById(id, user);
};

// ── Archive Member ───────────────────────────────────────────
exports.archiveMember = async (id, deletedBy, reason, user = {}) => {
  if (isScopedLeader(user)) {
    throw AppError.forbidden("Leaders can only remove members from their assigned scope");
  }

  const member = await Member.findOne({ where: { id } });
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  // Keep the account link so restoring this profile can restore its prior state.
  const linkedUser = await User.findOne({ where: { member_id: id, is_deleted: 0 } });

  const sequelize = require("../config/db");

  await sequelize.transaction(async (t) => {
    // Soft-delete the member
    await member.update(
      {
        is_deleted: 1,
        deleted_at: new Date(),
        deleted_by: deletedBy,
        archived_linked_user_active: linkedUser ? Number(linkedUser.is_active) : null,
      },
      { transaction: t }
    );

    // Deactivate the linked login and revoke sessions while retaining its link.
    if (linkedUser) {
      await linkedUser.update({ is_active: 0 }, { transaction: t });
      const now = new Date();
      await RefreshToken.update({ revoked: 1, revoked_at: now }, {
        where: { user_id: linkedUser.id, revoked: 0 }, transaction: t,
      });
      await PasswordResetToken.update({ used: 1 }, {
        where: { user_id: linkedUser.id, used: 0 }, transaction: t,
      });
      await UserSession.update({ logout_at: now }, {
        where: { user_id: linkedUser.id, logout_at: null }, transaction: t,
      });
    }
  });

  auditLog.log({ userId: deletedBy, action: "ARCHIVE_MEMBER", targetTable: "members", targetId: id, details: reason ? { reason } : undefined });
  cache.keys("dashboard:*").forEach((key) => cache.del(key));
  return { message: "Member archived. The linked login was deactivated and can be restored with the profile." };
};
exports.deleteMember = exports.archiveMember;

exports.unassignMemberFromScope = async (id, updatedBy, user = {}) => {
  const scope = getScope(user);
  if (!scope) {
    throw AppError.forbidden("No leader assignment is set for your account");
  }

  await ensureMemberInScope(id, user);

  if (scope.type === "ministry") {
    const row = await MinistryMembership.findOne({
      where: { ministry_role_id: scope.id, member_id: id },
    });
    if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Member is not in your ministry roster");
    await row.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: updatedBy });
    auditLog.log({ userId: updatedBy, action: "ARCHIVE_MINISTRY_MEMBERSHIP", targetTable: "ministry_memberships", targetId: row.id });
    return { message: "Ministry membership archived and retained in Archives." };
  }

  const member = await Member.findOne({ where: { id } });
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  if (scope.type === "cell_group") {
    await member.update({ cell_group_id: null });
    auditLog.log({ userId: updatedBy, action: "UNASSIGN_MEMBER_CELL_GROUP", targetTable: "members", targetId: id });
    return { message: "Member removed from your cell group." };
  }

  if (scope.type === "group") {
    await member.update({ group_id: null });
    auditLog.log({ userId: updatedBy, action: "UNASSIGN_MEMBER_GROUP", targetTable: "members", targetId: id });
    return { message: "Member removed from your group." };
  }

  throw AppError.badRequest("VALIDATION", "Unsupported leader scope");
};

exports.searchAssignableForScope = async ({ search = "", limit = 20 } = {}, user = {}) => {
  const scope = ensureScopeForAssignment(user);
  const where = buildSearchWhere(search);

  if (scope.type === "ministry") {
      const assigned = await MinistryMembership.findAll({
        where: { ministry_role_id: scope.id },
        attributes: ["member_id"],
        raw: true,
      });
    const assignedIds = assigned.map((row) => row.member_id);
    if (assignedIds.length > 0) where.id = { [Op.notIn]: assignedIds };
  }

  if (scope.type === "cell_group") {
    where.cell_group_id = null;
  }

  let group = null;
  if (scope.type === "group") {
    where.group_id = null;
    group = await getGroupForScope(scope);
    if (group && isYoungAdultsGroup(group.name)) {
      where.birthdate = youngAdultBirthdateRange();
    }
  }

  const candidates = await Member.findAll({
    where,
    attributes: memberSearchAttributes,
    include: memberIncludes,
    order: [["last_name", "ASC"], ["first_name", "ASC"]],
    limit: parseInt(limit, 10) || 20,
  });

  if (scope.type === "group" && group && isYoungAdultsGroup(group.name)) {
    return candidates.filter((member) => {
      const age = calcAge(member.birthdate);
      return age !== null && age >= 18 && age <= 29;
    });
  }

  return candidates;
};

exports.assignMemberToScope = async (memberId, updatedBy, user = {}) => {
  const scope = ensureScopeForAssignment(user);
  const result = await sequelize.transaction(async (transaction) => {
    // Serialize competing assignments on the member row so two leaders
    // cannot both claim a currently unassigned member.
    const member = await Member.findOne({
      where: { id: memberId, is_deleted: 0 },
      attributes: ["id", "birthdate", "cell_group_id", "group_id"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

    if (scope.type === "ministry") {
      const anyMembership = await MinistryMembership.findOne({
        where: { member_id: memberId },
        attributes: ["id", "ministry_role_id"],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (anyMembership) throw AppError.conflict("DUPLICATE", "Member is already assigned to a ministry");

      const row = await MinistryMembership.create({
        ministry_role_id: scope.id,
        member_id: memberId,
        added_by: updatedBy,
      }, { transaction });
      return { row, auditAction: "ASSIGN_MEMBER_MINISTRY", targetTable: "ministry_memberships" };
    }

    if (scope.type === "cell_group") {
      if (member.cell_group_id) throw AppError.conflict("DUPLICATE", "Member already belongs to a cell group");
      await member.update({ cell_group_id: scope.id }, { transaction });
      return { auditAction: "ASSIGN_MEMBER_CELL_GROUP", targetTable: "members" };
    }

    if (scope.type === "group") {
      if (member.group_id) throw AppError.conflict("DUPLICATE", "Member already belongs to a group");
      const group = await getGroupForScope(scope, { transaction });
      assertGroupEligibility(member, group);
      await member.update({ group_id: scope.id }, { transaction });
      return { auditAction: "ASSIGN_MEMBER_GROUP", targetTable: "members" };
    }

    throw AppError.badRequest("VALIDATION", "Unsupported leader scope");
  });

  auditLog.log({ userId: updatedBy, action: result.auditAction, targetTable: result.targetTable, targetId: memberId });
  cache.keys("dashboard:*").forEach((key) => cache.del(key));
  if (result.row) return result.row;
  return exports.getMemberById(memberId, user);
};

// ── Bulk Create Members from CSV ─────────────────────────────
const { parse } = require("csv-parse/sync");

const resolveCsvReferenceId = async (rawId, rawName, Model, label, csvRow) => {
  const idValue = String(rawId || "").trim();
  if (idValue) {
    if (!/^[1-9]\d*$/.test(idValue) || !Number.isSafeInteger(Number(idValue))) {
      throw AppError.badRequest("VALIDATION", `Invalid ${label} on CSV row ${csvRow}`);
    }
    return Number(idValue);
  }

  const name = String(rawName || "").trim();
  if (!name) return null;

  const matches = await Model.findAll({
    where: { name },
    attributes: ["id"],
    limit: 2,
  });
  if (matches.length !== 1) {
    throw AppError.badRequest("VALIDATION", `Unmatched or ambiguous ${label} on CSV row ${csvRow}`);
  }
  return Number(matches[0].id);
};

exports.bulkCreateMembers = async (csvBuffer, createdBy, user = {}) => {
  const records = parse(csvBuffer.toString("utf8"), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
    trim: true,
  });

  if (records.length === 0) throw AppError.badRequest("VALIDATION", "CSV file is empty");
  if (records.length > 500) throw AppError.badRequest("VALIDATION", "Maximum 500 members per batch");

  const results = { created: 0, skipped: 0, errors: [] };
  const createdIds = [];
  const { createMemberSchema } = require("../validators/members.validator");
  const uploadStorage = require("../middlewares/upload-s3");

  for (const [index, row] of records.entries()) {
    try {
      const sourceStatusText = String(row.source_status || row.status || "").trim();
      const statusKey = sourceStatusText.toLowerCase().replace(/[\s_-]+/g, "");
      const statusMappings = {
        active: { status: "Active" },
        inactive: { status: "Inactive" },
        in: { status: "Inactive" },
        new: { status: "Active", history: "New" },
        semiactive: { status: "Active", history: "Semi-Active" },
        visitor: { status: "Active", history: "Visitor" },
      };
      const mapping = statusKey ? statusMappings[statusKey] : { status: "Active" };
      if (!mapping) throw AppError.badRequest("VALIDATION", `Unsupported member status on CSV row ${index + 2}`);
      let profilePhotoUrl = null;
      if (row.profile_photo_url) {
        const photoKey = uploadStorage.getStoredFileKey(row.profile_photo_url, "profiles");
        if (!photoKey) throw AppError.badRequest("VALIDATION", `Profile photo path is invalid on CSV row ${index + 2}`);
        profilePhotoUrl = uploadStorage.getFileUrl(photoKey);
      }
      const data = {
        first_name: String(row.first_name || "").trim(),
        last_name: String(row.last_name || "").trim(),
        email: row.email || null,
        phone: row.phone || null,
        birthdate: row.birthdate || null,
        spiritual_birthday: row.spiritual_birthday || null,
        address: row.address || null,
        gender: row.gender || null,
        status: mapping.status,
        cell_group_id: await resolveCsvReferenceId(
          row.cell_group_id,
          row.cell_group_name,
          CellGroup,
          "cell group",
          index + 2,
        ),
        group_id: await resolveCsvReferenceId(
          row.group_id,
          row.group_name,
          MinistryGroup,
          "group",
          index + 2,
        ),
      };
      const validated = createMemberSchema.validate(data, { abortEarly: false });
      if (validated.error) throw AppError.badRequest("VALIDATION", `Invalid CSV row ${index + 2}: ${validated.error.details.map((item) => item.message).join("; ")}`);
      const memberData = profilePhotoUrl ? { ...validated.value, profile_photo_url: profilePhotoUrl } : validated.value;
      const createdMember = await exports.createMember(memberData, createdBy, user, mapping.history || null);
      createdIds.push({ row: index + 2, id: createdMember.id });
      results.created++;
    } catch (err) {
      results.skipped++;
      results.errors.push({ row: index + 2, error: err.code || "IMPORT_ROW_FAILED" });
    }
  }

  return { ...results, created_ids: createdIds };
  };

exports.updateMemberProfilePhoto = async (id, filePath, updatedBy, user = {}) => {
  await ensureMemberInScope(id, user);
  const member = await Member.findByPk(id);
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");
  const storage = require("../middlewares/upload-s3");
  const newKey = storage.getStoredFileKey(filePath, "profiles");
  if (!newKey) throw AppError.badRequest("VALIDATION", "Profile photo storage path is invalid");
  const oldKey = storage.getStoredFileKey(member.profile_photo_url, "profiles");
  const storedPath = storage.getFileUrl(newKey);
  await member.update({ profile_photo_url: storedPath });
  auditLog.log({ userId: updatedBy, action: "UPDATE_MEMBER_PHOTO", targetTable: "members", targetId: id });
  cache.keys("dashboard:*").forEach((key) => cache.del(key));
  if (oldKey && oldKey !== newKey) {
    try { await storage.deleteStoredFile(oldKey); }
    catch (error) { logger.warn(error, "Could not delete old member profile photo"); }
  }
  return await exports.getMemberById(id, user);
};

  // ── Link Member to User Account ───────────────────────────────
  exports.linkMemberAccount = async (memberId, { email, password }, adminId) => {
    const member = await Member.findByPk(memberId);
    if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

    const existingUser = await User.findOne({ where: { member_id: memberId } });
    if (existingUser) throw AppError.conflict("DUPLICATE", "Member already has a linked account");

    const emailExists = await User.findOne({ where: { email } });
    if (emailExists) throw AppError.conflict("DUPLICATE", "Email already in use");

    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const memberRole = await Role.findOne({ where: { role_name: "Member" } });
    if (!memberRole) throw new AppError("INTERNAL", 500, "Member role not found — seed database first");

    const user = await User.create({
      email,
      password_hash: hashedPassword,
      role_id: memberRole.id,
      member_id: memberId,
      is_active: 1,
    });

    auditLog.log({ userId: adminId, action: "LINK_MEMBER_ACCOUNT", targetTable: "users", targetId: user.id });
    return { message: "Account linked successfully", user_id: user.id };
  };
