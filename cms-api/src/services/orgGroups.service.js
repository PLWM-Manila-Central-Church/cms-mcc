"use strict";

const { Op, fn, col } = require("sequelize");
const AppError = require("../helpers/AppError");
const auditLog = require("../helpers/auditLog.helper");
const {
  MinistryRole,
  MinistryMembership,
  GroupPosition,
  GroupMemberPosition,
  GroupActivity,
  GroupTask,
  Member,
  User,
} = require("../models");

const assertGroupScope = (groupId, user) => {
  if (user?.roleName === "Ministry Leader" && user?.leadsMinistryId && Number(user.leadsMinistryId) !== Number(groupId)) {
    throw AppError.forbidden("This organizational group is outside your assigned scope.");
  }
};

exports.listGroups = async (user) => {
  const where = {
    is_deleted: 0,
    ...(user?.roleName === "Ministry Leader" && user?.leadsMinistryId ? { id: Number(user.leadsMinistryId) } : {}),
  };

  const [groups, memberCounts, positionCounts, openTaskCounts] = await Promise.all([
    MinistryRole.findAll({
      where,
      include: [
        { model: User, as: "leader", attributes: ["id", "email"], required: false },
        { model: User, as: "assistantLeader", attributes: ["id", "email"], required: false },
      ],
      order: [["name", "ASC"]],
    }),
    MinistryMembership.findAll({
      attributes: ["ministry_role_id", [fn("COUNT", col("id")), "cnt"]],
      group: ["ministry_role_id"],
      raw: true,
    }),
    GroupPosition.findAll({
      attributes: ["group_id", [fn("COUNT", col("id")), "cnt"]],
      where: { is_deleted: 0 },
      group: ["group_id"],
      raw: true,
    }).catch(() => []),
    GroupTask.findAll({
      attributes: ["group_id", [fn("COUNT", col("id")), "cnt"]],
      where: { is_deleted: 0, status: { [Op.in]: ["pending", "in_progress"] } },
      group: ["group_id"],
      raw: true,
    }).catch(() => []),
  ]);

  const memMap = new Map(memberCounts.map((r) => [Number(r.ministry_role_id), Number(r.cnt || 0)]));
  const posMap = new Map(positionCounts.map((r) => [Number(r.group_id), Number(r.cnt || 0)]));
  const taskMap = new Map(openTaskCounts.map((r) => [Number(r.group_id), Number(r.cnt || 0)]));

  return groups.map((g) => {
    const plain = g.toJSON();
    return {
      ...plain,
      member_count: memMap.get(plain.id) || 0,
      position_count: posMap.get(plain.id) || 0,
      open_task_count: taskMap.get(plain.id) || 0,
    };
  });
};

exports.getGroupDetail = async (groupId, user) => {
  assertGroupScope(groupId, user);
  const group = await MinistryRole.findOne({
    where: { id: groupId, is_deleted: 0 },
    include: [
      { model: User, as: "leader", attributes: ["id", "email"], required: false },
      { model: User, as: "assistantLeader", attributes: ["id", "email"], required: false },
    ],
  });
  if (!group) throw AppError.notFound("RECORD_NOT_FOUND", "Group not found");

  const [positions, memberPositions, memberships, activities, tasks] = await Promise.all([
    GroupPosition.findAll({ where: { group_id: group.id, is_deleted: 0 }, order: [["sort_order", "ASC"], ["name", "ASC"]] }).catch(() => []),
    GroupMemberPosition.findAll({
      where: { group_id: group.id, is_deleted: 0, is_active: 1 },
      include: [
        { model: Member, as: "member", attributes: ["id", "first_name", "last_name", "status", "phone"], required: false },
        { model: GroupPosition, as: "position", attributes: ["id", "name"], required: false },
      ],
    }).catch(() => []),
    MinistryMembership.findAll({
      where: { ministry_role_id: group.id },
      include: [{ model: Member, attributes: ["id", "first_name", "last_name", "status", "phone"], required: false }],
    }).catch(() => []),
    GroupActivity.findAll({ where: { group_id: group.id, is_deleted: 0 }, order: [["activity_date", "DESC"]], limit: 50 }).catch(() => []),
    GroupTask.findAll({
      where: { group_id: group.id, is_deleted: 0 },
      include: [{ model: Member, as: "assignedMember", attributes: ["id", "first_name", "last_name"], required: false }],
      order: [["due_date", "ASC"], ["created_at", "DESC"]],
      limit: 100,
    }).catch(() => []),
  ]);

  return {
    ...group.toJSON(),
    positions,
    member_positions: memberPositions,
    roster: memberships,
    activities,
    tasks,
  };
};

exports.createGroup = async (payload, actorId) => {
  const name = String(payload.name || "").trim();
  if (!name) throw AppError.badRequest("VALIDATION_ERROR", "Group name is required.");
  const dup = await MinistryRole.findOne({ where: { name, is_deleted: 0 } });
  if (dup) throw AppError.conflict("DUPLICATE", "A group with that name already exists.");

  const created = await MinistryRole.create({
    name,
    code: payload.code ? String(payload.code).trim().slice(0, 32) : null,
    category: payload.category || "Service Team",
    description: payload.description || null,
    leader_user_id: payload.leader_user_id || null,
    assistant_leader_user_id: payload.assistant_leader_user_id || null,
    established_date: payload.established_date || null,
    status: payload.status || "Active",
  });
  auditLog.log({ userId: actorId, action: "CREATE_ORG_GROUP", targetTable: "ministry_roles", targetId: created.id });
  return created;
};

exports.updateGroup = async (groupId, payload, user) => {
  assertGroupScope(groupId, user);
  const group = await MinistryRole.findOne({ where: { id: groupId, is_deleted: 0 } });
  if (!group) throw AppError.notFound("RECORD_NOT_FOUND", "Group not found");
  const updates = {};
  for (const field of ["name", "code", "category", "description", "leader_user_id", "assistant_leader_user_id", "established_date", "status"]) {
    if (payload[field] !== undefined) updates[field] = payload[field];
  }
  await group.update(updates);
  auditLog.log({ userId: user.userId, action: "UPDATE_ORG_GROUP", targetTable: "ministry_roles", targetId: group.id });
  return group;
};

exports.createPosition = async (groupId, payload, user) => {
  assertGroupScope(groupId, user);
  const name = String(payload.name || "").trim();
  if (!name) throw AppError.badRequest("VALIDATION_ERROR", "Position name is required.");
  const created = await GroupPosition.create({
    group_id: Number(groupId),
    name,
    responsibilities: payload.responsibilities || null,
    sort_order: Number(payload.sort_order || 0),
  });
  auditLog.log({ userId: user.userId, action: "CREATE_GROUP_POSITION", targetTable: "group_positions", targetId: created.id });
  return created;
};

exports.archivePosition = async (groupId, positionId, user) => {
  assertGroupScope(groupId, user);
  const row = await GroupPosition.findOne({ where: { id: positionId, group_id: groupId, is_deleted: 0 } });
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Position not found");
  await row.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: user.userId });
  return { id: row.id, archived: true };
};

exports.assignMemberPosition = async (groupId, payload, user) => {
  assertGroupScope(groupId, user);
  const memberId = Number(payload.member_id);
  const positionId = payload.position_id ? Number(payload.position_id) : null;
  if (!memberId) throw AppError.badRequest("VALIDATION_ERROR", "Member is required.");

  // Ensure member is also listed in ministry_memberships (multi-group allowed)
  await MinistryMembership.findOrCreate({
    where: { ministry_role_id: Number(groupId), member_id: memberId },
    defaults: { ministry_role_id: Number(groupId), member_id: memberId },
  });

  const [assignment, created] = await GroupMemberPosition.findOrCreate({
    where: { group_id: Number(groupId), member_id: memberId, position_id: positionId, is_deleted: 0 },
    defaults: { group_id: Number(groupId), member_id: memberId, position_id: positionId, assigned_by: user.userId, is_active: 1 },
  });
  if (!created && !assignment.is_active) {
    await assignment.update({ is_active: 1 });
  }
  auditLog.log({ userId: user.userId, action: "ASSIGN_GROUP_POSITION", targetTable: "group_member_positions", targetId: assignment.id });
  return assignment;
};

exports.createActivity = async (groupId, payload, user) => {
  assertGroupScope(groupId, user);
  const title = String(payload.title || "").trim();
  if (!title) throw AppError.badRequest("VALIDATION_ERROR", "Activity title is required.");
  const created = await GroupActivity.create({
    group_id: Number(groupId),
    title,
    description: payload.description || null,
    activity_date: payload.activity_date || null,
    start_time: payload.start_time || null,
    location: payload.location || null,
    status: payload.status || "planned",
    created_by: user.userId,
  });
  auditLog.log({ userId: user.userId, action: "CREATE_GROUP_ACTIVITY", targetTable: "group_activities", targetId: created.id });
  return created;
};

exports.createTask = async (groupId, payload, user) => {
  assertGroupScope(groupId, user);
  const title = String(payload.title || "").trim();
  if (!title) throw AppError.badRequest("VALIDATION_ERROR", "Task title is required.");
  const created = await GroupTask.create({
    group_id: Number(groupId),
    activity_id: payload.activity_id || null,
    title,
    description: payload.description || null,
    assigned_member_id: payload.assigned_member_id || null,
    due_date: payload.due_date || null,
    status: payload.status || "pending",
    created_by: user.userId,
  });
  auditLog.log({ userId: user.userId, action: "CREATE_GROUP_TASK", targetTable: "group_tasks", targetId: created.id });
  return created;
};

exports.updateTaskStatus = async (groupId, taskId, status, user) => {
  assertGroupScope(groupId, user);
  const allowed = ["pending", "in_progress", "completed", "cancelled"];
  if (!allowed.includes(status)) throw AppError.badRequest("VALIDATION_ERROR", "Invalid task status.");
  const task = await GroupTask.findOne({ where: { id: taskId, group_id: groupId, is_deleted: 0 } });
  if (!task) throw AppError.notFound("RECORD_NOT_FOUND", "Task not found");
  await task.update({ status, completed_at: status === "completed" ? new Date() : null });
  auditLog.log({ userId: user.userId, action: "UPDATE_GROUP_TASK", targetTable: "group_tasks", targetId: task.id });
  return task;
};
