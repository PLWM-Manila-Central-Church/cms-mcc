"use strict";

const { Role, User } = require("../models");
const auditLog        = require("../helpers/auditLog.helper");
const permissionCache = require("../helpers/permissionCache.helper");

// ── Get All Roles ────────────────────────────────────────────
exports.getAllRoles = async () => {
  return await Role.findAll({
    order: [["role_name", "ASC"]],
  });
};

// ── Get Role By ID ───────────────────────────────────────────
exports.getRoleById = async (id) => {
  const role = await Role.findByPk(id);
  if (!role) throw { status: 404, message: "Role not found" };
  return role;
};

// ── Create Role ──────────────────────────────────────────────
exports.createRole = async (data, createdBy) => {
  const { role_name, description } = data;

  const existing = await Role.findOne({ where: { role_name } });
  if (existing) throw { status: 409, message: "Role name already exists" };

  const role = await Role.create({
    role_name,
    description: description || null,
    is_system: 0,
  });

  auditLog.log({ userId: createdBy, action: "CREATE_ROLE", targetTable: "roles", targetId: role.id });
  return role;
};

// ── Update Role ──────────────────────────────────────────────
exports.updateRole = async (id, data, updatedBy) => {
  const role = await Role.findByPk(id);
  if (!role) throw { status: 404, message: "Role not found" };

  if (role.is_system)
    throw { status: 403, message: "System roles cannot be modified" };

  const { role_name, description } = data;

  if (role_name && role_name !== role.role_name) {
    const existing = await Role.findOne({ where: { role_name } });
    if (existing) throw { status: 409, message: "Role name already exists" };
  }

  await role.update({
    ...(role_name && { role_name }),
    ...(description !== undefined && { description }),
  });

  auditLog.log({ userId: updatedBy, action: "UPDATE_ROLE", targetTable: "roles", targetId: id });
  permissionCache.invalidate(parseInt(id));
  return role;
};

// ── Delete Role ──────────────────────────────────────────────
exports.deleteRole = async (id, deletedBy) => {
  const role = await Role.findByPk(id);
  if (!role) throw { status: 404, message: "Role not found" };

  if (role.is_system)
    throw { status: 403, message: "System roles cannot be deleted" };

  const usersWithRole = await User.count({ where: { role_id: id } });
  if (usersWithRole > 0)
    throw {
      status: 400,
      message: `Cannot delete role. ${usersWithRole} user(s) are still assigned to it`,
    };

  await role.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_ROLE", targetTable: "roles", targetId: id });
  permissionCache.invalidate(parseInt(id));
  return { message: "Role deleted successfully." };
};
