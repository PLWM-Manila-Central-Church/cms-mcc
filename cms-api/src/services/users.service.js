"use strict";

const bcrypt = require("bcrypt");
const { User, Role, Member, MinistryRole, MinistryMembership } = require("../models");
const auditLog = require("../helpers/auditLog.helper");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

const userIncludes = [
  { model: Role, as: "role", attributes: ["id", "role_name"] },
  {
    model: Member,
    as: "member",
    attributes: ["id", "first_name", "last_name", "cell_group_id", "group_id"],
    required: false,
    include: [
      {
        model: MinistryMembership,
        attributes: ["id", "ministry_role_id"],
        required: false,
      },
    ],
  },
  {
    model: MinistryRole,
    as: "leadsMinistry",
    attributes: ["id", "name"],
    required: false,
  },
];

// ── Get All Users ────────────────────────────────────────────
exports.getAllUsers = async () => {
  return await User.findAll({
    where: { is_deleted: 0 },
    attributes: { exclude: ["password_hash"] },
    include: userIncludes,
    order: [["created_at", "DESC"]],
  });
};

// ── Get User By ID ───────────────────────────────────────────
exports.getUserById = async (id) => {
  const user = await User.findOne({
    where: { id, is_deleted: 0 },
    attributes: { exclude: ["password_hash"] },
    include: userIncludes,
  });
  if (!user) throw { status: 404, message: "User not found" };
  return user;
};

// ── Create User ──────────────────────────────────────────────
exports.createUser = async (data, createdBy) => {
  const {
    email, password, role_id, member_id, invited_member_id,
    first_name, last_name, phone, gender, birthdate,
    spiritual_birthday, address, cell_group_id, group_id,
    leads_cell_group_id, leads_group_id, leads_ministry_id,
  } = data;

  const existing = await User.findOne({ where: { email, is_deleted: 0 } });
  if (existing) throw { status: 409, message: "Email already in use" };

  const role = await Role.findByPk(role_id);
  if (!role) throw { status: 404, message: "Role not found" };

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  let resolvedMemberId = member_id || null;
  if (!resolvedMemberId && first_name && last_name) {
    const member = await Member.create({
      first_name: first_name.trim(),
      last_name: last_name.trim(),
      email: email || null,
      phone: phone || null,
      gender: gender || null,
      birthdate: birthdate || null,
      spiritual_birthday: spiritual_birthday || null,
      address: address || null,
      cell_group_id: cell_group_id ? parseInt(cell_group_id) : null,
      group_id: group_id ? parseInt(group_id) : null,
      status: "Active",
      is_deleted: 0,
    });
    resolvedMemberId = member.id;
  }

  const user = await User.create({
    email,
    password_hash,
    role_id,
    member_id: resolvedMemberId || null,
    invited_member_id: invited_member_id || null,
    leads_cell_group_id: leads_cell_group_id ? parseInt(leads_cell_group_id) : null,
    leads_group_id: leads_group_id ? parseInt(leads_group_id) : null,
    leads_ministry_id: leads_ministry_id ? parseInt(leads_ministry_id) : null,
    is_active: 1,
    force_password_change: 1,
  });

  const created = await exports.getUserById(user.id);
  auditLog.log({ userId: createdBy, action: "CREATE_USER", targetTable: "users", targetId: created.id });
  return created;
};

// ── Update User ──────────────────────────────────────────────
exports.updateUser = async (id, data, updatedBy) => {
  const user = await User.findByPk(id);
  if (!user) throw { status: 404, message: "User not found" };

  const {
    email, role_id, member_id, invited_member_id, is_active,
    first_name, last_name, phone, gender, birthdate,
    spiritual_birthday, address, cell_group_id, group_id,
    leads_cell_group_id, leads_group_id, leads_ministry_id,
  } = data;

  if (email && email !== user.email) {
    const existing = await User.findOne({ where: { email, is_deleted: 0 } });
    if (existing) throw { status: 409, message: "Email already in use" };
  }

  if (role_id) {
    const role = await Role.findByPk(role_id);
    if (!role) throw { status: 404, message: "Role not found" };
  }

  await user.update({
    ...(email && { email }),
    ...(role_id && { role_id }),
    ...(member_id !== undefined && { member_id }),
    ...(invited_member_id !== undefined && { invited_member_id }),
    ...(is_active !== undefined && { is_active }),
    ...(leads_cell_group_id !== undefined && { leads_cell_group_id: leads_cell_group_id ? parseInt(leads_cell_group_id) : null }),
    ...(leads_group_id !== undefined && { leads_group_id: leads_group_id ? parseInt(leads_group_id) : null }),
    ...(leads_ministry_id !== undefined && { leads_ministry_id: leads_ministry_id ? parseInt(leads_ministry_id) : null }),
  });

  // Update linked member if exists
  if (user.member_id) {
    const member = await Member.findByPk(user.member_id);
    if (member) {
      await member.update({
        ...(first_name && { first_name: first_name.trim() }),
        ...(last_name && { last_name: last_name.trim() }),
        ...(phone !== undefined && { phone: phone || null }),
        ...(gender !== undefined && { gender: gender || null }),
        ...(birthdate !== undefined && { birthdate: birthdate || null }),
        ...(spiritual_birthday !== undefined && { spiritual_birthday: spiritual_birthday || null }),
        ...(address !== undefined && { address: address || null }),
        ...(cell_group_id !== undefined && { cell_group_id: cell_group_id ? parseInt(cell_group_id) : null }),
        ...(group_id !== undefined && { group_id: group_id ? parseInt(group_id) : null }),
      });
    }
  }

  auditLog.log({ userId: updatedBy, action: "UPDATE_USER", targetTable: "users", targetId: id });
return await exports.getUserById(id);
};

// ── Deactivate User (Soft Delete) ────────────────────────────
exports.deactivateUser = async (id, requestingUserId) => {
  if (parseInt(id) === parseInt(requestingUserId))
    throw { status: 400, message: "You cannot deactivate your own account" };

  const user = await User.findOne({ where: { id, is_deleted: 0 } });
  if (!user) throw { status: 404, message: "User not found" };

  await user.update({ is_active: 0 });
  auditLog.log({ userId: requestingUserId, action: "DEACTIVATE_USER", targetTable: "users", targetId: id });
  return { message: "User deactivated successfully." };
};

// ── Activate User ─────────────────────────────────────────────
exports.activateUser = async (id, requestingUserId) => {
  const user = await User.findOne({ where: { id, is_deleted: 0 } });
  if (!user) throw { status: 404, message: "User not found" };

  await user.update({ is_active: 1 });
  auditLog.log({ userId: requestingUserId, action: "ACTIVATE_USER", targetTable: "users", targetId: id });
  return { message: "User activated successfully." };
};

// ── Hard Delete User ──────────────────────────────────────────
exports.hardDeleteUser = async (id, requestingUserId) => {
  if (parseInt(id) === parseInt(requestingUserId))
    throw { status: 400, message: "You cannot delete your own account" };

  const user = await User.findOne({ where: { id, is_deleted: 0 } });
  if (!user) throw { status: 404, message: "User not found" };

  const sequelize = require("../config/db");

  // Capture member_id before deletion so we can cascade
  const linkedMemberId = user.member_id;

  await sequelize.transaction(async (t) => {
    // Nullify audit logs (preserve history but remove user reference)
    await sequelize.query(
      "UPDATE audit_logs SET user_id = NULL WHERE user_id = :userId",
      { replacements: { userId: id }, transaction: t }
    );

    // Delete dependent records
    await sequelize.query("DELETE FROM refresh_tokens WHERE user_id = :userId",        { replacements: { userId: id }, transaction: t });
    await sequelize.query("DELETE FROM password_reset_tokens WHERE user_id = :userId", { replacements: { userId: id }, transaction: t });
    await sequelize.query("DELETE FROM user_sessions WHERE user_id = :userId",         { replacements: { userId: id }, transaction: t });
    await sequelize.query("DELETE FROM notifications WHERE user_id = :userId",         { replacements: { userId: id }, transaction: t });
    await sequelize.query("DELETE FROM ministry_memberships WHERE added_by = :userId",          { replacements: { userId: id }, transaction: t });
    await sequelize.query("DELETE FROM ministry_event_invites WHERE invited_by = :userId",      { replacements: { userId: id }, transaction: t });

    // Soft delete the user (set is_deleted = 1)
    await user.update({ is_deleted: 1, deleted_at: new Date() }, { transaction: t });

    // Cascade: soft-delete the linked member (if any)
    if (linkedMemberId) {
      await sequelize.query(
        "UPDATE members SET is_deleted = 1, deleted_at = NOW(), deleted_by = :deletedBy WHERE id = :memberId AND is_deleted = 0",
        { replacements: { deletedBy: requestingUserId, memberId: linkedMemberId }, transaction: t }
      );
    }
  });

  auditLog.log({ userId: requestingUserId, action: "DELETE_USER", targetTable: "users", targetId: id });
  return { message: "User and linked member profile permanently deleted." };
};
