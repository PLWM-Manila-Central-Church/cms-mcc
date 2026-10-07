"use strict";

const { Op } = require("sequelize");
const sequelize = require("../config/db");
const { CellGroup, CellGroupHistory, Member, User, UserLeaderAssignment } = require("../models");
const auditLog = require("../helpers/auditLog.helper");
const { ensureMemberInScope, getScope, getUnifiedAssignments, isScopedLeader } = require("../helpers/scopedLeader.helper");
const AppError = require("../helpers/AppError");

const getCellGroupWhereForUser = (user = {}) => {
  if (user.roleName === "Leader") {
    const scope = getScope(user);
    if (scope.type === "cell_group") return { id: scope.id };
    if (scope.type !== "all") return { id: { [Op.in]: [] } };
    const ids = (scope.assignments || [])
      .filter((assignment) => assignment.type === "cell_group")
      .map((assignment) => assignment.id);
    return ids.length ? { id: { [Op.in]: ids } } : { id: null };
  }
  if (user.roleName !== "Cell Group Leader") return {};
  if (!user.leadsCellGroupId) return { id: null };
  return { id: user.leadsCellGroupId };
};

const ensureCellGroupAccess = (id, user = {}) => {
  if (user.roleName === "Leader") {
    const scope = getScope(user);
    const ownsCellGroup = getUnifiedAssignments(user).some((assignment) =>
      assignment.type === "cell_group" && Number(assignment.id) === Number(id));
    if (!ownsCellGroup || !["cell_group", "all"].includes(scope.type)) {
      throw AppError.forbidden("This cell group is outside your current leadership assignments");
    }
    return;
  }
  if (user.roleName !== "Cell Group Leader") return;
  if (!user.leadsCellGroupId || parseInt(id, 10) !== parseInt(user.leadsCellGroupId, 10)) {
    throw AppError.forbidden("This cell group is outside your assignment");
  }
};

const forbidScopedCellGroupManage = (user = {}) => {
  if (isScopedLeader(user)) {
    throw AppError.forbidden("Leaders can view assigned cell groups, not manage cell group records");
  }
};

// ── Get All Cell Groups (with member counts in a single query) ──
exports.getAllCellGroups = async (user = {}) => {
  const where = getCellGroupWhereForUser(user);
  const groups = await CellGroup.findAll({
    where,
    attributes: {
      include: [[
        sequelize.literal(`(
          SELECT COUNT(*)
          FROM members AS m
          WHERE m.cell_group_id = CellGroup.id AND m.is_deleted = 0
        )`),
        "memberCount",
      ]],
    },
    order: [["name", "ASC"]],
  });
  return groups;
};

// ── Get Cell Group By ID ─────────────────────────────────────
exports.getCellGroupById = async (id, user = {}) => {
  ensureCellGroupAccess(id, user);
  const cellGroup = await CellGroup.findByPk(id);
  if (!cellGroup) throw AppError.notFound("RECORD_NOT_FOUND", "Cell group not found");
  return cellGroup;
};

// ── Create Cell Group ────────────────────────────────────────
exports.createCellGroup = async (data, createdBy, user = {}) => {
  forbidScopedCellGroupManage(user);
  const { name, area } = data;
  const existing = await CellGroup.findOne({ where: { name } });
  if (existing)
    throw AppError.conflict("DUPLICATE", "Cell group name already exists");
  const cg = await CellGroup.create({ name, area: area || null });
  auditLog.log({ userId: createdBy, action: "CREATE_CELL_GROUP", targetTable: "cell_groups", targetId: cg.id });
  return cg;
};

// ── Update Cell Group ────────────────────────────────────────
exports.updateCellGroup = async (id, data, updatedBy, user = {}) => {
  forbidScopedCellGroupManage(user);
  const cellGroup = await CellGroup.findByPk(id);
  if (!cellGroup) throw AppError.notFound("RECORD_NOT_FOUND", "Cell group not found");

  const { name, area } = data;
  if (name && name !== cellGroup.name) {
    const existing = await CellGroup.findOne({ where: { name } });
    if (existing)
      throw AppError.conflict("DUPLICATE", "Cell group name already exists");
  }

  await cellGroup.update({
    ...(name && { name }),
    ...(area !== undefined && { area }),
  });
  auditLog.log({ userId: updatedBy, action: "UPDATE_CELL_GROUP", targetTable: "cell_groups", targetId: id });
  return cellGroup;
};

// ── Delete Cell Group ────────────────────────────────────────
exports.deleteCellGroup = async (id, deletedBy, user = {}) => {
  forbidScopedCellGroupManage(user);
  await sequelize.transaction(async (transaction) => {
    const cellGroup = await CellGroup.findByPk(id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!cellGroup) throw AppError.notFound("RECORD_NOT_FOUND", "Cell group not found");

    const [memberCount, normalizedLeaderCount, legacyLeaderCount] = await Promise.all([
      Member.count({ where: { cell_group_id: id }, transaction }),
      UserLeaderAssignment.count({ where: { scope_type: "cell_group", scope_id: id }, transaction }),
      User.count({ where: { leads_cell_group_id: id, is_deleted: 0 }, transaction }),
    ]);
    if (memberCount > 0) {
      throw AppError.conflict("CELL_GROUP_IN_USE", `Cannot delete. ${memberCount} member(s) are in this cell group`);
    }
    if (normalizedLeaderCount > 0 || legacyLeaderCount > 0) {
      throw AppError.conflict(
        "LEADER_ASSIGNMENTS_EXIST",
        "Cannot delete a cell group with current or historical leader assignments. Reassign leaders first.",
      );
    }

    await cellGroup.destroy({ transaction });
  });
  auditLog.log({ userId: deletedBy, action: "DELETE_CELL_GROUP", targetTable: "cell_groups", targetId: id });
  return { message: "Cell group deleted successfully." };
};

// ── Get Cell Group History ───────────────────────────────────
exports.getCellGroupHistory = async (memberId, user = {}) => {
  await ensureMemberInScope(memberId, user);
  const member = await Member.findByPk(memberId);
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  return await CellGroupHistory.findAll({
    where: { member_id: memberId },
    order: [["created_at", "DESC"]],
  });
};

// ── Create Cell Group History ────────────────────────────────
exports.createCellGroupHistory = async (data, changedBy, user = {}) => {
  if (isScopedLeader(user)) {
    throw AppError.forbidden("Leaders can remove members from their assignment, not move them between cell groups");
  }
  const { member_id, new_cell_group_id, reason } = data;

  const member = await Member.findByPk(member_id);
  if (!member) throw AppError.notFound("RECORD_NOT_FOUND", "Member not found");

  // Derive old_cell_group_id from the DB — never trust the client
  const old_cell_group_id = member.cell_group_id || null;

  if (new_cell_group_id) {
    const cellGroup = await CellGroup.findByPk(new_cell_group_id);
    if (!cellGroup) throw AppError.notFound("RECORD_NOT_FOUND", "New cell group not found");
  }

  // Update member's cell group
  await member.update({ cell_group_id: new_cell_group_id || null });

  const history = await CellGroupHistory.create({
    member_id,
    old_cell_group_id,
    new_cell_group_id: new_cell_group_id || null,
    changed_by: changedBy,
    reason: reason || null,
  });

  auditLog.log({
    userId: changedBy,
    action: "CHANGE_MEMBER_CELL_GROUP",
    targetTable: "cell_group_history",
    targetId: history.id,
  });

  return history;
};
