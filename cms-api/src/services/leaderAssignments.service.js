"use strict";

const AppError = require("../helpers/AppError");
const {
  AuditLog,
  CellGroup,
  Member,
  MinistryGroup,
  MinistryRole,
  UserLeaderAssignment,
} = require("../models");

const LEADER_ROLE = "Leader";
const ROLE_SCOPE_TYPES = Object.freeze({
  "Cell Group Leader": ["cell_group"],
  "Group Leader": ["member_group"],
  "Ministry Leader": ["ministry"],
  Leader: ["cell_group", "member_group"],
});

const normalizedId = (value, field) => {
  if (value == null || value === "") return null;
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) {
    throw AppError.badRequest("INVALID_LEADER_ASSIGNMENT", `${field} must be a valid team id`);
  }
  return id;
};

const currentScopeId = (row) => Number(row.scope_id);

const targetsForRole = async (roleName, data = {}, existingRows = [], creating = false, legacyFields = {}) => {
  const allowed = ROLE_SCOPE_TYPES[roleName] || [];
  const desired = new Map(allowed.map((type) => [type, null]));

  if (roleName === "Leader") {
    if (data.leader_assignments === undefined) {
      if (creating) {
        throw AppError.badRequest(
          "LEADER_ASSIGNMENTS_REQUIRED",
          "Select a cell group, a group, or both when creating a Leader account",
        );
      }
      for (const row of existingRows) {
        if (Number(row.is_active ?? 1) !== 1 || row.revoked_at) continue;
        if (desired.has(row.scope_type) && desired.get(row.scope_type) === null) {
          desired.set(row.scope_type, currentScopeId(row));
        }
      }
    } else {
      const input = data.leader_assignments || {};
      desired.set("cell_group", normalizedId(input.cell_group_id, "Cell group"));
      desired.set("member_group", normalizedId(input.group_id, "Group"));
    }
    if (creating && ![...desired.values()].some(Boolean)) {
      throw AppError.badRequest(
        "LEADER_ASSIGNMENTS_REQUIRED",
        "Select a cell group, a group, or both when creating a Leader account",
      );
    }
  } else if (roleName === "Cell Group Leader") {
    const existingId = existingRows.find((row) => row.scope_type === "cell_group" && Number(row.is_active ?? 1) === 1 && !row.revoked_at)?.scope_id;
    const value = data.leads_cell_group_id !== undefined ? data.leads_cell_group_id : existingId ?? legacyFields.leads_cell_group_id;
    desired.set("cell_group", normalizedId(value, "Cell group"));
  } else if (roleName === "Group Leader") {
    const existingId = existingRows.find((row) => row.scope_type === "member_group" && Number(row.is_active ?? 1) === 1 && !row.revoked_at)?.scope_id;
    const value = data.leads_group_id !== undefined ? data.leads_group_id : existingId ?? legacyFields.leads_group_id;
    desired.set("member_group", normalizedId(value, "Group"));
  } else if (roleName === "Ministry Leader") {
    const existingId = existingRows.find((row) => row.scope_type === "ministry" && Number(row.is_active ?? 1) === 1 && !row.revoked_at)?.scope_id;
    const value = data.leads_ministry_id !== undefined ? data.leads_ministry_id : existingId ?? legacyFields.leads_ministry_id;
    desired.set("ministry", normalizedId(value, "Ministry"));
  }

  if (roleName !== "Leader" && ROLE_SCOPE_TYPES[roleName]?.length && ![...desired.values()].some(Boolean)) {
    const assignmentName = roleName === "Cell Group Leader"
      ? "cell group"
      : roleName === "Group Leader" ? "group" : "ministry";
    throw AppError.badRequest("LEADER_ASSIGNMENT_REQUIRED", `Select the ${assignmentName} this user will lead`);
  }

  return desired;
};

const validateAssignmentTargets = async (desired, transaction) => {
  for (const [type, id] of desired) {
    if (!id) continue;
    const model = type === "cell_group"
      ? CellGroup
      : type === "member_group"
        ? MinistryGroup
        : MinistryRole;
    const target = await model.findByPk(id, {
      attributes: ["id"],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!target) {
      throw AppError.notFound(
        "LEADER_SCOPE_NOT_FOUND",
        `${type === "cell_group" ? "Cell group" : type === "member_group" ? "Group" : "Ministry"} is not available`,
      );
    }
  }
};

const assignmentProjections = (roleName, desired) => ({
  leads_cell_group_id: roleName === "Leader" || roleName === "Cell Group Leader"
    ? desired.get("cell_group") || null
    : null,
  leads_group_id: roleName === "Leader" || roleName === "Group Leader"
    ? desired.get("member_group") || null
    : null,
  leads_ministry_id: roleName === "Ministry Leader"
    ? desired.get("ministry") || null
    : null,
});

const persistAssignments = async ({
  userId,
  actorId,
  roleName,
  desired,
  reason,
  existingRows,
  transaction,
}) => {
  const currentRows = existingRows || await UserLeaderAssignment.findAll({
    where: { user_id: userId },
    order: [["scope_type", "ASC"], ["scope_id", "ASC"], ["id", "ASC"]],
    transaction,
    lock: transaction.LOCK.UPDATE,
  });
  await validateAssignmentTargets(desired, transaction);

  const desiredKeys = new Set(
    [...desired.entries()]
      .filter(([, scopeId]) => scopeId != null)
      .map(([type, scopeId]) => `${type}:${Number(scopeId)}`),
  );
  const activeRows = currentRows.filter((row) =>
    Number(row.is_active ?? 1) === 1 && !row.revoked_at);

  for (const [scopeType, scopeId] of desired) {
    if (!scopeId) continue;
    const matchingRows = currentRows.filter((row) =>
      row.scope_type === scopeType && currentScopeId(row) === Number(scopeId));
    const active = matchingRows.find((row) =>
      Number(row.is_active ?? 1) === 1 && !row.revoked_at);
    if (active) continue;

    const reactivated = matchingRows[0];
    const nextVersion = Number(reactivated?.version || 0) + 1;
    let row;
    if (reactivated) {
      row = await reactivated.update({
        is_active: true,
        version: nextVersion,
        legacy_column: scopeType === "cell_group"
          ? "leads_cell_group_id"
          : scopeType === "member_group" ? "leads_group_id" : "leads_ministry_id",
        assigned_by: actorId,
        revoked_by: null,
        revoked_at: null,
        revocation_reason: null,
      }, { transaction });
    } else {
      row = await UserLeaderAssignment.create({
        user_id: userId,
        scope_type: scopeType,
        scope_id: Number(scopeId),
        legacy_column: scopeType === "cell_group"
          ? "leads_cell_group_id"
          : scopeType === "member_group" ? "leads_group_id" : "leads_ministry_id",
        assigned_by: actorId,
        is_active: true,
        version: nextVersion,
      }, { transaction });
    }

    await AuditLog.create({
      user_id: actorId,
      action: reactivated ? "LEADER_SCOPE_REACTIVATED" : "LEADER_SCOPE_ASSIGNED",
      target_table: "user_leader_assignments",
      target_id: row.id,
      old_values: reactivated ? { is_active: false, version: nextVersion - 1 } : null,
      new_values: { user_id: userId, scope_type: scopeType, scope_id: Number(scopeId), version: nextVersion, reason },
    }, { transaction });
  }

  for (const row of activeRows) {
    if (desiredKeys.has(`${row.scope_type}:${currentScopeId(row)}`)) continue;
    const nextVersion = Number(row.version || 1) + 1;
    await row.update({
      is_active: false,
      version: nextVersion,
      revoked_by: actorId,
      revoked_at: new Date(),
      revocation_reason: reason,
    }, { transaction });
    await AuditLog.create({
      user_id: actorId,
      action: "LEADER_SCOPE_REVOKED",
      target_table: "user_leader_assignments",
      target_id: row.id,
      old_values: { is_active: true, version: nextVersion - 1 },
      new_values: {
        user_id: userId,
        scope_type: row.scope_type,
        scope_id: currentScopeId(row),
        is_active: false,
        version: nextVersion,
        reason,
      },
    }, { transaction });
  }

  return assignmentProjections(roleName, desired);
};

module.exports = {
  LEADER_ROLE,
  ROLE_SCOPE_TYPES,
  assignmentProjections,
  persistAssignments,
  targetsForRole,
  validateAssignmentTargets,
};
