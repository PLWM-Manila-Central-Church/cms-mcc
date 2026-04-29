"use strict";

const { CellGroup, CellGroupHistory, Member } = require("../models");
const auditLog = require("../helpers/auditLog.helper");
const { ensureMemberInScope, isScopedLeader } = require("../helpers/scopedLeader.helper");

const getCellGroupWhereForUser = (user = {}) => {
  if (user.roleName !== "Cell Group Leader") return {};
  if (!user.leadsCellGroupId) return { id: null };
  return { id: user.leadsCellGroupId };
};

const ensureCellGroupAccess = (id, user = {}) => {
  if (user.roleName !== "Cell Group Leader") return;
  if (!user.leadsCellGroupId || parseInt(id, 10) !== parseInt(user.leadsCellGroupId, 10)) {
    throw { status: 403, message: "This cell group is outside your assignment" };
  }
};

const forbidScopedCellGroupManage = (user = {}) => {
  if (isScopedLeader(user)) {
    throw { status: 403, message: "Leaders can view assigned cell groups, not manage cell group records" };
  }
};

// ── Get All Cell Groups ──────────────────────────────────────
exports.getAllCellGroups = async (user = {}) => {
  const groups = await CellGroup.findAll({
    where: getCellGroupWhereForUser(user),
    order: [["name", "ASC"]],
  });
  // Attach member count to each group
  const withCounts = await Promise.all(
    groups.map(async (g) => {
      const plain = g.toJSON();
      plain.memberCount = await Member.count({
        where: { cell_group_id: g.id, is_deleted: 0 },
      });
      return plain;
    })
  );
  return withCounts;
};

// ── Get Cell Group By ID ─────────────────────────────────────
exports.getCellGroupById = async (id, user = {}) => {
  ensureCellGroupAccess(id, user);
  const cellGroup = await CellGroup.findByPk(id);
  if (!cellGroup) throw { status: 404, message: "Cell group not found" };
  return cellGroup;
};

// ── Create Cell Group ────────────────────────────────────────
exports.createCellGroup = async (data, createdBy, user = {}) => {
  forbidScopedCellGroupManage(user);
  const { name, area } = data;
  const existing = await CellGroup.findOne({ where: { name } });
  if (existing)
    throw { status: 409, message: "Cell group name already exists" };
  const cg = await CellGroup.create({ name, area: area || null });
  auditLog.log({ userId: createdBy, action: "CREATE_CELL_GROUP", targetTable: "cell_groups", targetId: cg.id });
  return cg;
};

// ── Update Cell Group ────────────────────────────────────────
exports.updateCellGroup = async (id, data, updatedBy, user = {}) => {
  forbidScopedCellGroupManage(user);
  const cellGroup = await CellGroup.findByPk(id);
  if (!cellGroup) throw { status: 404, message: "Cell group not found" };

  const { name, area } = data;
  if (name && name !== cellGroup.name) {
    const existing = await CellGroup.findOne({ where: { name } });
    if (existing)
      throw { status: 409, message: "Cell group name already exists" };
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
  const cellGroup = await CellGroup.findByPk(id);
  if (!cellGroup) throw { status: 404, message: "Cell group not found" };

  const inUse = await Member.count({ where: { cell_group_id: id } });
  if (inUse > 0)
    throw {
      status: 400,
      message: `Cannot delete. ${inUse} member(s) are in this cell group`,
    };

  await cellGroup.destroy();
  auditLog.log({ userId: deletedBy, action: "DELETE_CELL_GROUP", targetTable: "cell_groups", targetId: id });
  return { message: "Cell group deleted successfully." };
};

// ── Get Cell Group History ───────────────────────────────────
exports.getCellGroupHistory = async (memberId, user = {}) => {
  await ensureMemberInScope(memberId, user);
  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };

  return await CellGroupHistory.findAll({
    where: { member_id: memberId },
    order: [["created_at", "DESC"]],
  });
};

// ── Create Cell Group History ────────────────────────────────
exports.createCellGroupHistory = async (data, changedBy, user = {}) => {
  if (isScopedLeader(user)) {
    throw { status: 403, message: "Leaders can remove members from their assignment, not move them between cell groups" };
  }
  const { member_id, new_cell_group_id, reason } = data;

  const member = await Member.findByPk(member_id);
  if (!member) throw { status: 404, message: "Member not found" };

  // Derive old_cell_group_id from the DB — never trust the client
  const old_cell_group_id = member.cell_group_id || null;

  if (new_cell_group_id) {
    const cellGroup = await CellGroup.findByPk(new_cell_group_id);
    if (!cellGroup) throw { status: 404, message: "New cell group not found" };
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
