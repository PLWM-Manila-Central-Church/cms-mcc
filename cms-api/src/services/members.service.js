"use strict";

const { Op }                                                    = require("sequelize");
const { Member, CellGroup, Group, EmergencyContact, User,
        MinistryMembership }                                     = require("../models");
const auditLog = require("../helpers/auditLog.helper");

const memberIncludes = [
  {
    model: CellGroup,
    as: "cellGroup",
    attributes: ["id", "name", "area"],
    required: false,
  },
  {
    model: Group,
    as: "group",
    attributes: ["id", "name"],
    required: false,
  },
];

// ── Get All Members (paginated) ──────────────────────────────
exports.getAllMembers = async ({ page = 1, limit = 20, search, status, cell_group_id, group_id } = {}, user = {}) => {
  const offset = (parseInt(page) - 1) * parseInt(limit);
  const where  = { is_deleted: 0 };

  const {
    roleId          = null,
    leadsCellGroupId = null,
    leadsGroupId     = null,
    ministryRoleId   = null,
  } = user;

  // Role-based scoping — restrict what the caller can see
  // Role IDs: 5 = Cell Group Leader, 6 = Group Leader
  // Ministry Leader = Registration Team (3) with ministryRoleId set
  if (roleId === 5 && leadsCellGroupId) {
    // Cell Group Leader: only their cell group
    where.cell_group_id = leadsCellGroupId;
  } else if (roleId === 6 && leadsGroupId) {
    // Group Leader: only their group
    where.group_id = leadsGroupId;
  } else if (roleId === 3 && ministryRoleId) {
    // Ministry Leader: only members enrolled in their ministry
    const memberships = await MinistryMembership.findAll({
      where:      { ministry_role_id: ministryRoleId },
      attributes: ["member_id"],
    });
    const memberIds = memberships.map((m) => m.member_id);
    // If the ministry has no members yet, return empty result immediately
    if (memberIds.length === 0) {
      return { members: [], total: 0, total_pages: 0 };
    }
    where.id = { [Op.in]: memberIds };
  }
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
exports.getMemberById = async (id) => {
  const member = await Member.findOne({
    where: { id },
    include: [
      ...memberIncludes,
      { model: EmergencyContact, as: "emergencyContacts", required: false },
    ],
  });
  if (!member) throw { status: 404, message: "Member not found" };
  return member;
};

// ── Create Member ────────────────────────────────────────────
exports.createMember = async (data, createdBy, user = {}) => {
  const {
    first_name, last_name, email, phone, birthdate, spiritual_birthday,
    address, gender, status, cell_group_id, group_id, referred_by,
    profile_photo_url, barcode,
  } = data;

  if (email) {
    const existing = await Member.findOne({ where: { email } });
    if (existing) throw { status: 409, message: "Email already in use" };
  }

  if (barcode) {
    const existing = await Member.findOne({ where: { barcode } });
    if (existing) throw { status: 409, message: "Barcode already in use" };
  }

  if (cell_group_id) {
    const cellGroup = await CellGroup.findByPk(cell_group_id);
    if (!cellGroup) throw { status: 404, message: "Cell group not found" };
  }

  if (group_id) {
    const group = await Group.findByPk(group_id);
    if (!group) throw { status: 404, message: "Group not found" };
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

  // Auto-enroll: if the creator is a Ministry Leader, add the new member
  // to their ministry roster automatically.
  const { roleId, ministryRoleId } = user;
  if (roleId === 3 && ministryRoleId) {
    try {
      await MinistryMembership.findOrCreate({
        where: { ministry_role_id: ministryRoleId, member_id: member.id },
        defaults: { ministry_role_id: ministryRoleId, member_id: member.id, added_by: createdBy },
      });
    } catch (err) {
      console.error("[Members] Ministry auto-enroll failed:", err.message);
    }
  }

  auditLog.log({ userId: createdBy, action: "CREATE_MEMBER", targetTable: "members", targetId: created.id });
  return created;
};

// ── Update Member ────────────────────────────────────────────
exports.updateMember = async (id, data, updatedBy) => {
  const member = await Member.findOne({ where: { id } });
  if (!member) throw { status: 404, message: "Member not found" };

  const {
    first_name, last_name, email, phone, birthdate, spiritual_birthday,
    address, gender, status, cell_group_id, group_id, referred_by,
    profile_photo_url, barcode,
  } = data;

  if (email && email !== member.email) {
    const existing = await Member.findOne({ where: { email } });
    if (existing) throw { status: 409, message: "Email already in use" };
  }

  if (barcode && barcode !== member.barcode) {
    const existing = await Member.findOne({ where: { barcode } });
    if (existing) throw { status: 409, message: "Barcode already in use" };
  }

  if (cell_group_id) {
    const cellGroup = await CellGroup.findByPk(cell_group_id);
    if (!cellGroup) throw { status: 404, message: "Cell group not found" };
  }

  if (group_id) {
    const group = await Group.findByPk(group_id);
    if (!group) throw { status: 404, message: "Group not found" };
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
  return await exports.getMemberById(id);
};

// ── Soft Delete Member ───────────────────────────────────────
exports.deleteMember = async (id, deletedBy) => {
  const member = await Member.findOne({ where: { id } });
  if (!member) throw { status: 404, message: "Member not found" };

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

  auditLog.log({ userId: deletedBy, action: "DELETE_MEMBER", targetTable: "members", targetId: id });
  return { message: "Member deleted and linked user account deactivated." };
};
