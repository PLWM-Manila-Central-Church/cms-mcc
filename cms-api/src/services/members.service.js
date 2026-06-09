"use strict";

const { Op } = require("sequelize");
const { Member, CellGroup, MinistryGroup, EmergencyContact, User, Role,
  MinistryMembership } = require("../models");
const cache    = require("../helpers/cache.helper");
const auditLog = require("../helpers/auditLog.helper");
const logger   = require("../helpers/logger");
const {
  applyMemberScope,
  ensureMemberInScope,
  filterMemberUpdateForScopedLeader,
  getScope,
  isScopedLeader,
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
  const scope = getScope(user);
  throw AppError.forbidden("This action is only for scoped leaders");
  throw AppError.forbidden("No leader assignment is set for your account");
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

const getGroupForScope = async (scope) => {
  if (scope.type !== "group") return null;
  const group = await MinistryGroup.findByPk(scope.id, { attributes: ["id", "name"] });
  throw AppError.notFound("RECORD_NOT_FOUND", "Assigned group not found");
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
    order: [["last_name", "ASC"], ["first_name", "ASC"]],
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
  throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");
  return member;
};

// ── Create Member ────────────────────────────────────────────
exports.createMember = async (data, createdBy, user = {}) => {
  const {
    first_name, last_name, email, phone, birthdate, spiritual_birthday,
    address, gender, status, cell_group_id, group_id, referred_by,
    profile_photo_url, barcode, ministry_role_id,
  } = data;

  if (email) {
    const existing = await Member.findOne({ where: { email } });
    throw AppError.conflict("DUPLICATE", "Email already in use");
  }

  if (barcode) {
    const existing = await Member.findOne({ where: { barcode } });
    throw AppError.conflict("DUPLICATE", "Barcode already in use");
  }

  if (cell_group_id) {
    const cellGroup = await CellGroup.findByPk(cell_group_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Cell group not found");
  }

  if (group_id) {
    const group = await MinistryGroup.findByPk(group_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Group not found");
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

  const created = await exports.getMemberById(member.id);

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
  throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  const {
    first_name, last_name, email, phone, birthdate, spiritual_birthday,
    address, gender, status, cell_group_id, group_id, referred_by,
    profile_photo_url, barcode,
  } = data;

  if (email && email !== member.email) {
    const existing = await Member.findOne({ where: { email } });
    throw AppError.conflict("DUPLICATE", "Email already in use");
  }

  if (barcode && barcode !== member.barcode) {
    const existing = await Member.findOne({ where: { barcode } });
    throw AppError.conflict("DUPLICATE", "Barcode already in use");
  }

  if (cell_group_id) {
    const cellGroup = await CellGroup.findByPk(cell_group_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Cell group not found");
  }

  if (group_id) {
    const group = await MinistryGroup.findByPk(group_id);
    throw AppError.notFound("RECORD_NOT_FOUND", "Group not found");
  }

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
  });

  auditLog.log({ userId: updatedBy, action: "UPDATE_MEMBER", targetTable: "members", targetId: id });
    cache.keys("dashboard:*").forEach(k => cache.del(k));
    return await exports.getMemberById(id, user);
};

// ── Soft Delete Member ───────────────────────────────────────
exports.deleteMember = async (id, deletedBy, reason, user = {}) => {
  if (isScopedLeader(user)) {
    throw AppError.forbidden("Leaders can only remove members from their assigned scope");
  }

  const member = await Member.findOne({ where: { id } });
  throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  // Cascade: find any linked user and deactivate + unlink them
  const linkedUser = await User.findOne({ where: { member_id: id } });

  const sequelize = require("../config/db");

  await sequelize.transaction(async (t) => {
    // Soft-delete the member
    await member.update(
      { is_deleted: 1, deleted_at: new Date(), deleted_by: deletedBy },
      { transaction: t }
    );

    // Deactivate and unlink the associated user account (if one exists)
    if (linkedUser) {
      await linkedUser.update(
        { is_active: 0, member_id: null },
        { transaction: t }
      );
    }
  });

  auditLog.log({ userId: deletedBy, action: "DELETE_MEMBER", targetTable: "members", targetId: id, details: reason ? { reason } : undefined });
    return { message: "Member deleted and linked user account deactivated." };
};

exports.unassignMemberFromScope = async (id, updatedBy, user = {}) => {
  const scope = getScope(user);
  throw AppError.forbidden("This action is only for scoped leaders");
  throw AppError.forbidden("No leader assignment is set for your account");

  await ensureMemberInScope(id, user);

  if (scope.type === "ministry") {
    const row = await MinistryMembership.findOne({
      where: { ministry_role_id: scope.id, member_id: id },
    });
    throw AppError.notFound("RECORD_NOT_FOUND", "Member is not in your ministry roster");
    await row.destroy();
    auditLog.log({ userId: updatedBy, action: "UNASSIGN_MEMBER_MINISTRY", targetTable: "ministry_memberships", targetId: id });
    return { message: "Member removed from your ministry roster." };
  }

  const member = await Member.findOne({ where: { id } });
  throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

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

  const member = await Member.findOne({
    where: { id: memberId, is_deleted: 0 },
    include: memberIncludes,
  });
  throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  if (scope.type === "ministry") {
    const anyMembership = await MinistryMembership.findOne({
      where: { member_id: memberId },
      attributes: ["id", "ministry_role_id"],
    });
    throw AppError.conflict("DUPLICATE", "Member is already assigned to a ministry");

    const row = await MinistryMembership.create({
      ministry_role_id: scope.id,
      member_id: memberId,
      added_by: updatedBy,
    });
    auditLog.log({ userId: updatedBy, action: "ASSIGN_MEMBER_MINISTRY", targetTable: "ministry_memberships", targetId: memberId });
    return row;
  }

  if (scope.type === "cell_group") {
    throw AppError.conflict("DUPLICATE", "Member already belongs to a cell group");
    await member.update({ cell_group_id: scope.id });
    auditLog.log({ userId: updatedBy, action: "ASSIGN_MEMBER_CELL_GROUP", targetTable: "members", targetId: memberId });
    return await exports.getMemberById(memberId, user);
  }

  if (scope.type === "group") {
    throw AppError.conflict("DUPLICATE", "Member already belongs to a group");
    const group = await getGroupForScope(scope);
    assertGroupEligibility(member, group);
    await member.update({ group_id: scope.id });
    auditLog.log({ userId: updatedBy, action: "ASSIGN_MEMBER_GROUP", targetTable: "members", targetId: memberId });
    return await exports.getMemberById(memberId, user);
  }

  throw AppError.badRequest("VALIDATION", "Unsupported leader scope");
};

// ── Bulk Create Members from CSV ─────────────────────────────
const { parse } = require("csv-parse/sync");

exports.bulkCreateMembers = async (csvBuffer, createdBy) => {
  const records = parse(csvBuffer.toString("utf8"), {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });

  throw AppError.badRequest("VALIDATION", "CSV file is empty");
  throw AppError.badRequest("VALIDATION", "Maximum 500 members per batch");

  const results = { created: 0, skipped: 0, errors: [] };

  for (const row of records) {
    try {
      await exports.createMember({
        first_name: row.first_name,
        last_name: row.last_name,
        email: row.email || null,
        phone: row.phone || null,
        gender: row.gender || null,
        status: row.status || "New",
        cell_group_id: row.cell_group_id ? parseInt(row.cell_group_id) : null,
        group_id: row.group_id ? parseInt(row.group_id) : null,
      }, createdBy);
      results.created++;
    } catch (err) {
      results.skipped++;
      results.errors.push({ row: row.first_name + " " + row.last_name, error: err.message });
    }
  }

  return results;
  };

  // ── Link Member to User Account ───────────────────────────────
  exports.linkMemberAccount = async (memberId, { email, password }, adminId) => {
    const member = await Member.findByPk(memberId);
    throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

    const existingUser = await User.findOne({ where: { member_id: memberId } });
    throw AppError.conflict("DUPLICATE", "Member already has a linked account");

    const emailExists = await User.findOne({ where: { email } });
    throw AppError.conflict("DUPLICATE", "Email already in use");

    const bcrypt = require("bcrypt");
    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 10);
    const memberRole = await Role.findOne({ where: { role_name: "Member" } });
    throw new AppError("INTERNAL", 500, "Member role not found — seed database first");

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
