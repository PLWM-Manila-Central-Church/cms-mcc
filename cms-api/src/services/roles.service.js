"use strict";

const { Role, User, RolePermission, Permission } = require("../models");
const auditLog        = require("../helpers/auditLog.helper");
const permissionCache = require("../helpers/permissionCache.helper");

// ── Internal helper: sync role permissions (replace all) ─────
const syncPermissions = async (roleId, permissionIds, transaction) => {
  const opts = transaction ? { transaction } : {};
  await RolePermission.destroy({ where: { role_id: roleId }, ...opts });
  if (permissionIds && permissionIds.length > 0) {
    const entries = permissionIds.map((pid) => ({ role_id: roleId, permission_id: pid }));
    await RolePermission.bulkCreate(entries, opts);
  }
  permissionCache.invalidate(parseInt(roleId));
};

// ── Get All Roles ────────────────────────────────────────────
exports.getAllRoles = async () => {
  return await Role.findAll({
    include: [{ model: Permission, as: "permissions", attributes: ["id", "module", "action"], through: { attributes: [] } }],
    order: [["role_name", "ASC"]],
  });
};

// ── Get Role By ID ───────────────────────────────────────────
exports.getRoleById = async (id) => {
  const role = await Role.findByPk(id, {
    include: [{ model: Permission, as: "permissions", attributes: ["id", "module", "action"], through: { attributes: [] } }],
  });
  if (!role) throw { status: 404, message: "Role not found" };
  return role;
};

// ── Create Role ──────────────────────────────────────────────
exports.createRole = async (data, createdBy) => {
  const { role_name, description, permissions } = data;

  const existing = await Role.findOne({ where: { role_name } });
  if (existing) throw { status: 409, message: "Role name already exists" };

  const role = await Role.create({
    role_name,
    description: description || null,
    is_system: 0,
  });

  if (permissions && permissions.length > 0) {
    await syncPermissions(role.id, permissions);
  }

  auditLog.log({ userId: createdBy, action: "CREATE_ROLE", targetTable: "roles", targetId: role.id });
  return await exports.getRoleById(role.id);
};

// ── Update Role ──────────────────────────────────────────────
exports.updateRole = async (id, data, updatedBy) => {
  const role = await Role.findByPk(id);
  if (!role) throw { status: 404, message: "Role not found" };

  if (role.is_system)
    throw { status: 403, message: "System roles cannot be modified" };

  const { role_name, description, permissions } = data;

  if (role_name && role_name !== role.role_name) {
    const existing = await Role.findOne({ where: { role_name } });
    if (existing) throw { status: 409, message: "Role name already exists" };
  }

  await role.update({
    ...(role_name && { role_name }),
    ...(description !== undefined && { description }),
  });

  if (permissions !== undefined) {
    await syncPermissions(role.id, permissions);
  } else {
    permissionCache.invalidate(parseInt(id));
  }

  auditLog.log({ userId: updatedBy, action: "UPDATE_ROLE", targetTable: "roles", targetId: id });
  return await exports.getRoleById(id);
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

  await RolePermission.destroy({ where: { role_id: id } });
  await role.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_ROLE", targetTable: "roles", targetId: id });
  permissionCache.invalidate(parseInt(id));
  return { message: "Role deleted successfully." };
};

// ── Sync Permissions (separate endpoint) ─────────────────────
exports.syncRolePermissions = async (roleId, permissionIds, updatedBy) => {
  const role = await Role.findByPk(roleId);
  if (!role) throw { status: 404, message: "Role not found" };

  if (role.is_system)
    throw { status: 403, message: "System role permissions cannot be modified" };

  await syncPermissions(roleId, permissionIds);

  auditLog.log({ userId: updatedBy, action: "SYNC_ROLE_PERMISSIONS", targetTable: "role_permissions", targetId: roleId });
  return await exports.getRoleById(roleId);
};
