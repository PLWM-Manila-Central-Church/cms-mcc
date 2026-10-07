"use strict";

const AppError = require("./AppError");

const LEADER_ROLE_NAME = "Leader";
const normalizeScopeType = (type) => {
  if (type === "cell_group") return "cell_group";
  if (type === "member_group" || type === "group") return "group";
  if (type === "ministry") return "ministry";
  return null;
};

const scopeKey = (type, id) => `${type === "group" ? "member_group" : type}:${Number(id)}`;

const parseScopeKey = (value) => {
  if (value === "all") return { type: "all", id: null };
  if (typeof value !== "string") return null;
  const match = /^(cell_group|member_group|group):([1-9][0-9]*)$/.exec(value);
  if (!match) return null;
  const id = Number(match[2]);
  if (!Number.isSafeInteger(id)) return null;
  return { type: normalizeScopeType(match[1]), id };
};

const getLeaderAssignments = (user = {}) => {
  if (user.roleName !== LEADER_ROLE_NAME) return [];
  if (!Array.isArray(user.leaderAssignments)) return [];
  return user.leaderAssignments
    .filter((row) => row
      && row.is_active !== false
      && Number(row.is_active ?? 1) === 1
      && !row.revoked_at)
    .map((row) => ({
      assignmentId: Number(row.id),
      type: normalizeScopeType(row.scope_type),
      id: Number(row.scope_id),
      version: Number(row.version || 1),
      legacyColumn: row.legacy_column || null,
    }))
    .filter((row) => row.type && Number.isSafeInteger(row.id) && row.id > 0);
};

const getLeaderScope = (user = {}, requestedKey = user.leaderScopeKey) => {
  const assignments = getLeaderAssignments(user);
  if (user.leaderAssignmentsLoaded !== true && !Array.isArray(user.leaderAssignments)) {
    return { type: "unavailable", id: null, assignments: [], authoritative: false };
  }
  if (!assignments.length) return { type: "none", id: null, assignments, authoritative: true };

  if (requestedKey === "all") return { type: "all", id: null, assignments, authoritative: true };
  if (requestedKey) {
    const requested = parseScopeKey(requestedKey);
    if (!requested || requested.type === "all") {
      return { type: "invalid", id: null, assignments, authoritative: true };
    }
    const found = assignments.find((assignment) => assignment.type === requested.type && assignment.id === requested.id);
    return found
      ? { ...found, assignments: [found], authoritative: true }
      : { type: "invalid", id: null, assignments, authoritative: true };
  }

  if (assignments.length === 1) return { ...assignments[0], assignments, authoritative: true };
  return { type: "all", id: null, assignments, authoritative: true };
};

const requireLeaderScope = (user = {}, requestedKey = user.leaderScopeKey) => {
  const scope = getLeaderScope(user, requestedKey);
  if (["cell_group", "group"].includes(scope.type) && scope.id) return scope;
  if (scope.type === "invalid") throw AppError.forbidden("This team is not in your current leadership assignments");
  if (scope.type === "unavailable") {
    throw AppError.conflict("LEADER_ASSIGNMENTS_UNAVAILABLE", "Your team assignments are still loading. Reload and try again");
  }
  throw AppError.conflict("LEADER_SCOPE_REQUIRED", "Select one assigned team before making this change");
};

const getLegacyLeaderScope = (user = {}) => {
  if (user.roleName === "Ministry Leader") return { type: "ministry", id: user.leadsMinistryId || null, assignments: [] };
  if (user.roleName === "Cell Group Leader") return { type: "cell_group", id: user.leadsCellGroupId || null, assignments: [] };
  if (user.roleName === "Group Leader") return { type: "group", id: user.leadsGroupId || null, assignments: [] };
  return null;
};

const sameScope = (left, right) => left.type === right.type && Number(left.id) === Number(right.id);

module.exports = {
  LEADER_ROLE_NAME,
  getLeaderAssignments,
  getLeaderScope,
  getLegacyLeaderScope,
  normalizeScopeType,
  parseScopeKey,
  requireLeaderScope,
  sameScope,
  scopeKey,
};
