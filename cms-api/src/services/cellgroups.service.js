"use strict";

const { CellGroup, CellGroupHistory, Member } = require("../models");

// ── Get All Cell Groups ──────────────────────────────────────
exports.getAllCellGroups = async () => {
  return await CellGroup.findAll({ order: [["name", "ASC"]] });
};

// ── Get Cell Group By ID ─────────────────────────────────────
exports.getCellGroupById = async (id) => {
  const cellGroup = await CellGroup.findByPk(id);
  if (!cellGroup) throw { status: 404, message: "Cell group not found" };
  return cellGroup;
};

// ── Create Cell Group ────────────────────────────────────────
exports.createCellGroup = async (data) => {
  const { name, area } = data;
  const existing = await CellGroup.findOne({ where: { name } });
  if (existing)
    throw { status: 409, message: "Cell group name already exists" };
  return await CellGroup.create({ name, area: area || null });
};

// ── Update Cell Group ────────────────────────────────────────
exports.updateCellGroup = async (id, data) => {
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
  return cellGroup;
};

// ── Delete Cell Group ────────────────────────────────────────
exports.deleteCellGroup = async (id) => {
  const cellGroup = await CellGroup.findByPk(id);
  if (!cellGroup) throw { status: 404, message: "Cell group not found" };

  const inUse = await Member.count({ where: { cell_group_id: id } });
  if (inUse > 0)
    throw {
      status: 400,
      message: `Cannot delete. ${inUse} member(s) are in this cell group`,
    };

  await cellGroup.destroy();
  return { message: "Cell group deleted successfully." };
};

// ── Get Cell Group History ───────────────────────────────────
exports.getCellGroupHistory = async (memberId) => {
  const member = await Member.findByPk(memberId);
  if (!member) throw { status: 404, message: "Member not found" };

  return await CellGroupHistory.findAll({
    where: { member_id: memberId },
    order: [["created_at", "DESC"]],
  });
};

// ── Create Cell Group History ────────────────────────────────
exports.createCellGroupHistory = async (data, changedBy) => {
  const { member_id, old_cell_group_id, new_cell_group_id, reason } = data;

  const member = await Member.findByPk(member_id);
  if (!member) throw { status: 404, message: "Member not found" };

  if (new_cell_group_id) {
    const cellGroup = await CellGroup.findByPk(new_cell_group_id);
    if (!cellGroup) throw { status: 404, message: "New cell group not found" };
  }

  // Update member's cell group
  await member.update({ cell_group_id: new_cell_group_id || null });

  return await CellGroupHistory.create({
    member_id,
    old_cell_group_id: old_cell_group_id || null,
    new_cell_group_id: new_cell_group_id || null,
    changed_by: changedBy,
    reason: reason || null,
  });
};
