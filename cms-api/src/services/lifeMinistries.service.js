"use strict";

const { Op, fn, col } = require("sequelize");
const AppError = require("../helpers/AppError");
const auditLog = require("../helpers/auditLog.helper");
const { MinistryGroup, Member, User } = require("../models");
const { getScope } = require("../helpers/scopedLeader.helper");

const resolveMinistryScopeIds = (user) => {
  if (!user) return null;
  if (["System Admin", "Pastor", "Registration Team"].includes(user.roleName)) return null;
  if (user.roleName === "Group Leader" && user.leadsGroupId) return [Number(user.leadsGroupId)];
  if (user.roleName === "Leader") {
    const scope = getScope(user);
    if (scope?.type === "group" || scope?.type === "member_group") return [Number(scope.id)];
    if (scope?.type === "all") {
      return (scope.assignments || [])
        .filter((a) => ["group", "member_group"].includes(a.type))
        .map((a) => Number(a.id));
    }
    return [];
  }
  return [];
};

exports.listMinistries = async (user) => {
  const scopeIds = resolveMinistryScopeIds(user);
  if (Array.isArray(scopeIds) && scopeIds.length === 0) return [];
  const where = {
    is_deleted: 0,
    ...(Array.isArray(scopeIds) ? { id: { [Op.in]: scopeIds } } : {}),
  };

  const [rows, memberCounts, activeCounts] = await Promise.all([
    MinistryGroup.findAll({
      where,
      include: [
        { model: User, as: "leader", attributes: ["id", "email"], required: false },
        { model: User, as: "assistantLeader", attributes: ["id", "email"], required: false },
      ],
      order: [["name", "ASC"]],
    }),
    Member.findAll({
      attributes: ["group_id", [fn("COUNT", col("id")), "cnt"]],
      where: { group_id: { [Op.ne]: null } },
      group: ["group_id"],
      raw: true,
    }),
    Member.findAll({
      attributes: ["group_id", [fn("COUNT", col("id")), "cnt"]],
      where: { group_id: { [Op.ne]: null }, status: "Active" },
      group: ["group_id"],
      raw: true,
    }),
  ]);

  const totalMap = new Map(memberCounts.map((r) => [Number(r.group_id), Number(r.cnt || 0)]));
  const activeMap = new Map(activeCounts.map((r) => [Number(r.group_id), Number(r.cnt || 0)]));

  return rows.map((row) => {
    const plain = row.toJSON();
    const total = totalMap.get(plain.id) || 0;
    const active = activeMap.get(plain.id) || 0;
    return {
      ...plain,
      member_count: total,
      active_member_count: active,
      inactive_member_count: Math.max(0, total - active),
    };
  });
};

exports.getMinistryDetail = async (id, user) => {
  const scopeIds = resolveMinistryScopeIds(user);
  if (Array.isArray(scopeIds) && !scopeIds.includes(Number(id))) {
    throw AppError.forbidden("This ministry is outside your assigned scope.");
  }
  const ministry = await MinistryGroup.findOne({
    where: { id, is_deleted: 0 },
    include: [
      { model: User, as: "leader", attributes: ["id", "email"], required: false },
      { model: User, as: "assistantLeader", attributes: ["id", "email"], required: false },
    ],
  });
  if (!ministry) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry not found");

  const members = await Member.findAll({
    where: { group_id: ministry.id },
    attributes: ["id", "first_name", "last_name", "email", "phone", "status", "gender", "birthdate", "join_date"],
    order: [["last_name", "ASC"], ["first_name", "ASC"]],
    limit: 500,
  });

  const activeCount = members.filter((m) => m.status === "Active").length;
  return {
    ...ministry.toJSON(),
    member_count: members.length,
    active_member_count: activeCount,
    members,
  };
};

exports.createMinistry = async (payload, actorId) => {
  const name = String(payload.name || "").trim();
  if (!name) throw AppError.badRequest("VALIDATION_ERROR", "Ministry name is required.");
  const duplicate = await MinistryGroup.findOne({ where: { name, is_deleted: 0 } });
  if (duplicate) throw AppError.conflict("DUPLICATE", "A ministry with that name already exists.");

  const created = await MinistryGroup.create({
    name,
    code: payload.code ? String(payload.code).trim().slice(0, 32) : null,
    description: payload.description || null,
    leader_user_id: payload.leader_user_id || null,
    assistant_leader_user_id: payload.assistant_leader_user_id || null,
    age_min: payload.age_min ?? null,
    age_max: payload.age_max ?? null,
    status: payload.status || "Active",
  });
  auditLog.log({ userId: actorId, action: "CREATE_MINISTRY", targetTable: "ministry_groups", targetId: created.id });
  return created;
};

exports.updateMinistry = async (id, payload, actorId) => {
  const row = await MinistryGroup.findOne({ where: { id, is_deleted: 0 } });
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry not found");

  const updates = {};
  for (const field of ["name", "code", "description", "leader_user_id", "assistant_leader_user_id", "age_min", "age_max", "status"]) {
    if (payload[field] !== undefined) updates[field] = payload[field];
  }
  await row.update(updates);
  auditLog.log({ userId: actorId, action: "UPDATE_MINISTRY", targetTable: "ministry_groups", targetId: row.id });
  return row;
};

exports.archiveMinistry = async (id, actorId) => {
  const row = await MinistryGroup.findOne({ where: { id, is_deleted: 0 } });
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Ministry not found");
  await row.update({ is_deleted: 1, status: "Archived", deleted_at: new Date(), deleted_by: actorId });
  auditLog.log({ userId: actorId, action: "ARCHIVE_MINISTRY", targetTable: "ministry_groups", targetId: row.id });
  return { id: row.id, archived: true };
};
