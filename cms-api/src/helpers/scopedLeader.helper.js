"use strict";

const { Op } = require("sequelize");
const { Member, MinistryMembership } = require("../models");
const AppError = require("./AppError");
const {
  getLeaderScope,
  getLegacyLeaderScope,
  requireLeaderScope,
} = require("./leaderAssignments.helper");

const SCOPED_ROLES = new Set(["Ministry Leader", "Cell Group Leader", "Group Leader", "Leader"]);
const GLOBAL_MEMBER_READ_ROLES = new Set(["System Admin", "Pastor", "Registration Team"]);

const isScopedLeader = (user = {}) => SCOPED_ROLES.has(user.roleName);
const isGlobalMemberReader = (user = {}) => GLOBAL_MEMBER_READ_ROLES.has(user.roleName);

const getScope = (user = {}, scopeKey = user.leaderScopeKey) =>
  user.roleName === "Leader"
    ? getLeaderScope(user, scopeKey)
    : getLegacyLeaderScope(user);

const getLegacyMinistryMemberIds = async (ministryRoleId, transaction) => {
  if (!ministryRoleId) return [];
  const memberships = await MinistryMembership.findAll({
    where: { ministry_role_id: ministryRoleId },
    attributes: ["member_id"],
    ...(transaction && { transaction }),
  });
  return memberships.map((membership) => Number(membership.member_id));
};

const scopeToMemberWhere = async (scope, { transaction } = {}) => {
  if (!scope || ["none", "invalid", "unavailable"].includes(scope.type)) {
    return { id: { [Op.in]: [] } };
  }

  if (scope.type === "ministry") {
    const ids = await getLegacyMinistryMemberIds(scope.id, transaction);
    return { id: { [Op.in]: ids } };
  }

  if (scope.type === "cell_group") {
    return scope.id ? { cell_group_id: Number(scope.id) } : { id: { [Op.in]: [] } };
  }
  if (scope.type === "group") {
    return scope.id ? { group_id: Number(scope.id) } : { id: { [Op.in]: [] } };
  }
  if (scope.type === "all") {
    const clauses = (scope.assignments || [])
      .filter((assignment) => assignment.id && ["cell_group", "group"].includes(assignment.type))
      .map((assignment) => assignment.type === "cell_group"
        ? { cell_group_id: Number(assignment.id) }
        : { group_id: Number(assignment.id) });
    if (!clauses.length) return { id: { [Op.in]: [] } };
    return clauses.length === 1 ? clauses[0] : { [Op.or]: clauses };
  }

  return { id: { [Op.in]: [] } };
};

const getMemberScopeWhere = async (user = {}, options = {}) => {
  const scope = getScope(user, options.scopeKey);
  if (scope) return scopeToMemberWhere(scope, options);
  if (isGlobalMemberReader(user)) return null;
  // Fail closed for accounts that do not have an explicitly global role or
  // a recognized, assigned leader scope.
  return { id: { [Op.in]: [] } };
};

const applyMemberScope = async (where = {}, user = {}, options = {}) => {
  const scopeWhere = await getMemberScopeWhere(user, options);
  if (!scopeWhere) return where;

  // Preserve client filters separately from the authorization predicate so a
  // search Op.or can never replace an assigned-scope Op.or.
  const filterWhere = {};
  for (const key of Reflect.ownKeys(where)) filterWhere[key] = where[key];
  for (const key of Reflect.ownKeys(where)) delete where[key];
  where[Op.and] = [filterWhere, scopeWhere];
  return where;
};

const ensureMemberInScope = async (
  memberId,
  user = {},
  options = {},
) => {
  const scope = getScope(user, options.scopeKey);
  if (!scope) {
    if (isGlobalMemberReader(user)) return undefined;
    throw AppError.forbidden("This account has no member-roster access");
  }

  const scopeWhere = await scopeToMemberWhere(scope, options);
  const member = await Member.findOne({
    where: { [Op.and]: [{ id: memberId }, scopeWhere] },
    attributes: ["id"],
    ...(options.transaction && {
      transaction: options.transaction,
      lock: options.transaction.LOCK.UPDATE,
    }),
  });
  if (!member) throw AppError.forbidden("This member is outside your assigned scope");
  return member;
};

const filterMemberUpdateForScopedLeader = (data = {}, user = {}) => {
  if (!isScopedLeader(user)) return data;
  const allowed = [
    "first_name", "last_name", "email", "phone", "birthdate",
    "spiritual_birthday", "address", "gender", "profile_photo_url",
  ];
  return allowed.reduce((result, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) result[key] = data[key];
    return result;
  }, {});
};

module.exports = {
  applyMemberScope,
  ensureMemberInScope,
  filterMemberUpdateForScopedLeader,
  getMemberScopeWhere,
  getLegacyMinistryMemberIds,
  getScope,
  isGlobalMemberReader,
  isScopedLeader,
  requireLeaderScope,
  scopeToMemberWhere,
};
