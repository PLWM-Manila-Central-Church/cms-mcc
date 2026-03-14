"use strict";

const bcrypt = require("bcrypt");
const { User, Role, Member } = require("../models");

const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS) || 10;

const userIncludes = [
  { model: Role, as: "role", attributes: ["id", "role_name"] },
  {
    model: Member,
    as: "member",
    attributes: ["id", "first_name", "last_name", "cell_group_id", "group_id"],
    required: false,
  },
];

// ── Get All Users ────────────────────────────────────────────
exports.getAllUsers = async () => {
  return await User.findAll({
    attributes: { exclude: ["password_hash"] },
    include: userIncludes,
    order: [["created_at", "DESC"]],
  });
};

// ── Get User By ID ───────────────────────────────────────────
exports.getUserById = async (id) => {
  const user = await User.findByPk(id, {
    attributes: { exclude: ["password_hash"] },
    include: userIncludes,
  });
  if (!user) throw { status: 404, message: "User not found" };
  return user;
};

// ── Create User ──────────────────────────────────────────────
exports.createUser = async (data) => {
  const { email, password, role_id, member_id, invited_member_id } = data;

  const existing = await User.findOne({ where: { email } });
  if (existing) throw { status: 409, message: "Email already in use" };

  const role = await Role.findByPk(role_id);
  if (!role) throw { status: 404, message: "Role not found" };

  const password_hash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await User.create({
    email,
    password_hash,
    role_id,
    member_id: member_id || null,
    invited_member_id: invited_member_id || null,
    is_active: 1,
    force_password_change: 1,
  });

  return await exports.getUserById(user.id);
};

// ── Update User ──────────────────────────────────────────────
exports.updateUser = async (id, data) => {
  const user = await User.findByPk(id);
  if (!user) throw { status: 404, message: "User not found" };

  const { email, role_id, member_id, invited_member_id, is_active } = data;

  if (email && email !== user.email) {
    const existing = await User.findOne({ where: { email } });
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
  });

  return await exports.getUserById(id);
};

// ── Deactivate User (Soft Delete) ────────────────────────────
exports.deactivateUser = async (id, requestingUserId) => {
  if (parseInt(id) === parseInt(requestingUserId))
    throw { status: 400, message: "You cannot deactivate your own account" };

  const user = await User.findByPk(id);
  if (!user) throw { status: 404, message: "User not found" };

  await user.update({ is_active: 0 });
  return { message: "User deactivated successfully." };
};

// ── Activate User ─────────────────────────────────────────────
exports.activateUser = async (id) => {
  const user = await User.findByPk(id);
  if (!user) throw { status: 404, message: "User not found" };

  await user.update({ is_active: 1 });
  return { message: "User activated successfully." };
};

// ── Hard Delete User ──────────────────────────────────────────
exports.hardDeleteUser = async (id, requestingUserId) => {
  if (parseInt(id) === parseInt(requestingUserId))
    throw { status: 400, message: "You cannot delete your own account" };

  const user = await User.findByPk(id);
  if (!user) throw { status: 404, message: "User not found" };

  const { sequelize } = require("../models");

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

    // Hard delete the user
    await user.destroy({ transaction: t });
  });

  return { message: "User permanently deleted." };
};
