"use strict";

const { Op } = require("sequelize");
const AppError = require("../helpers/AppError");
const { Role } = require("../models");
const permissionCache = require("../helpers/permissionCache.helper");
const { getScope } = require("../helpers/scopedLeader.helper");
const { getLeaderAssignments, requireLeaderScope } = require("../helpers/leaderAssignments.helper");

const ROLE_PROFILE_BY_SCOPE = Object.freeze({
  cell_group: "Cell Group Leader",
  group: "Group Leader",
});
const ROLE_PROFILE_CACHE_MS = 60_000;
let roleProfileCache = { expiresAt: 0, ids: new Map() };

const getRoleProfileIds = async () => {
  if (roleProfileCache.expiresAt > Date.now() && roleProfileCache.ids.size) {
    return roleProfileCache.ids;
  }
  const roles = await Role.findAll({
    where: { role_name: { [Op.in]: Object.values(ROLE_PROFILE_BY_SCOPE) } },
    attributes: ["id", "role_name"],
  });
  const ids = new Map(roles.map((role) => [role.role_name, Number(role.id)]));
  roleProfileCache = { ids, expiresAt: Date.now() + ROLE_PROFILE_CACHE_MS };
  return ids;
};

const scopeTypesForRequest = (scope) => {
  if (!scope || ["none", "invalid", "unavailable"].includes(scope.type)) return [];
  if (["cell_group", "group"].includes(scope.type)) return [scope.type];
  if (scope.type === "all") {
    return [...new Set((scope.assignments || [])
      .map((assignment) => assignment.type)
      .filter((type) => Object.prototype.hasOwnProperty.call(ROLE_PROFILE_BY_SCOPE, type)))];
  }
  return [];
};

const getLeaderPermissionProfiles = async (user = {}) => {
  if (user.roleName !== "Leader") return {};
  const types = [...new Set(getLeaderAssignments(user).map((assignment) => assignment.type))];
  if (!types.length) return {};
  const roleIds = await getRoleProfileIds();
  const existingProfiles = new Set(types.map((type) => ROLE_PROFILE_BY_SCOPE[type]).filter((name) => roleIds.has(name)));
  const entries = await Promise.all([...existingProfiles].map(async (profileName) => {
    const permissions = await permissionCache.get(roleIds.get(profileName));
    return [profileName === "Cell Group Leader" ? "cell_group" : "group", [...permissions]];
  }));
  return Object.fromEntries(entries);
};

const getLeaderProfilePermissions = async (user = {}, scopeKey = user.leaderScopeKey) => {
  const profileMap = await getLeaderPermissionProfiles(user);
  if (user.roleName !== "Leader") return new Set();
  const scope = getScope(user, scopeKey);
  const types = scopeTypesForRequest(scope);
  return new Set(types.flatMap((type) => profileMap[type] || []));
};

const hasLeaderProfilePermission = async (user = {}, module, action, scopeKey = user.leaderScopeKey) => {
  const permissions = await getLeaderProfilePermissions(user, scopeKey);
  return permissions.has(`${module}:${action}`);
};

const requireLeaderPermissionContext = async (user = {}, module, action, scopeKey = user.leaderScopeKey) => {
  if (user.roleName !== "Leader") return;
  const scope = getScope(user, scopeKey);
  if (["none", "unavailable", "invalid"].includes(scope.type)) requireLeaderScope(user, scopeKey);

  const profilePermissions = await getLeaderProfilePermissions(user, scopeKey);
  if (!profilePermissions.has(`${module}:${action}`)) {
    throw AppError.forbidden("This operation is not permitted for the selected leadership assignment");
  }
};

const invalidateLeaderRoleProfileCache = () => {
  roleProfileCache = { expiresAt: 0, ids: new Map() };
};

module.exports = {
  getLeaderProfilePermissions,
  getLeaderPermissionProfiles,
  hasLeaderProfilePermission,
  invalidateLeaderRoleProfileCache,
  requireLeaderPermissionContext,
};
