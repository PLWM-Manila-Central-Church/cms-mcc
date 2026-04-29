"use strict";

const { Op } = require("sequelize");
const { Member, MinistryMembership } = require("../models");

const SCOPED_ROLES = new Set(["Ministry Leader", "Cell Group Leader", "Group Leader"]);

const isScopedLeader = (user = {}) => SCOPED_ROLES.has(user.roleName);

const getScope = (user = {}) => {
  if (user.roleName === "Ministry Leader") {
    return { type: "ministry", id: user.leadsMinistryId || null };
  }
  if (user.roleName === "Cell Group Leader") {
    return { type: "cell_group", id: user.leadsCellGroupId || null };
  }
  if (user.roleName === "Group Leader") {
    return { type: "group", id: user.leadsGroupId || null };
  }
  return null;
};

const getMinistryMemberIds = async (ministryRoleId) => {
  if (!ministryRoleId) return [];
  const memberships = await MinistryMembership.findAll({
    where: { ministry_role_id: ministryRoleId },
    attributes: ["member_id"],
  });
  return memberships.map((m) => m.member_id);
};

const getMemberScopeWhere = async (user = {}) => {
  const scope = getScope(user);
  if (!scope) return null;
  if (!scope.id) return { id: { [Op.in]: [] } };

  if (scope.type === "ministry") {
    const memberIds = await getMinistryMemberIds(scope.id);
    return { id: { [Op.in]: memberIds } };
  }

  if (scope.type === "cell_group") return { cell_group_id: scope.id };
  if (scope.type === "group") return { group_id: scope.id };
  return null;
};

const applyMemberScope = async (where = {}, user = {}) => {
  const scopeWhere = await getMemberScopeWhere(user);
  if (!scopeWhere) return where;

  if (scopeWhere.id && Array.isArray(scopeWhere.id[Op.in]) && scopeWhere.id[Op.in].length === 0) {
    where.id = { [Op.in]: [] };
    return where;
  }

  Object.assign(where, scopeWhere);
  return where;
};

const ensureMemberInScope = async (memberId, user = {}) => {
  const scope = getScope(user);
  if (!scope) return;

  if (!scope.id) {
    throw { status: 403, message: "No leader assignment is linked to your account" };
  }

  if (scope.type === "ministry") {
    const membership = await MinistryMembership.findOne({
      where: { member_id: memberId, ministry_role_id: scope.id },
      attributes: ["id"],
    });

    if (!membership) {
      throw { status: 403, message: "This member is outside your assigned scope" };
    }
    return;
  }

  const where = { id: memberId };
  if (scope.type === "cell_group") where.cell_group_id = scope.id;
  if (scope.type === "group") where.group_id = scope.id;

  const member = await Member.findOne({ where, attributes: ["id"] });

  if (!member) {
    throw { status: 403, message: "This member is outside your assigned scope" };
  }
};

const filterMemberUpdateForScopedLeader = (data = {}, user = {}) => {
  if (!isScopedLeader(user)) return data;

  const allowed = [
    "first_name",
    "last_name",
    "email",
    "phone",
    "birthdate",
    "spiritual_birthday",
    "address",
    "gender",
    "profile_photo_url",
    "barcode",
  ];

  return allowed.reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(data, key)) acc[key] = data[key];
    return acc;
  }, {});
};

module.exports = {
  applyMemberScope,
  ensureMemberInScope,
  filterMemberUpdateForScopedLeader,
  getMemberScopeWhere,
  getMinistryMemberIds,
  getScope,
  isScopedLeader,
};
