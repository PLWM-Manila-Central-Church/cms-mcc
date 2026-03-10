"use strict";

const { AuditLog, User } = require("../models");
const { Op } = require("sequelize");

exports.getAllLogs = async (query = {}) => {
  const page   = Math.max(1, parseInt(query.page)  || 1);
  const limit  = Math.max(1, parseInt(query.limit) || 30);
  const offset = (page - 1) * limit;

  const where = {};
  if (query.action)       where.action       = { [Op.like]: `%${query.action}%` };
  if (query.target_table) where.target_table = query.target_table;
  if (query.user_id)      where.user_id      = query.user_id;
  if (query.date_from || query.date_to) {
    where.created_at = {};
    if (query.date_from) where.created_at[Op.gte] = new Date(query.date_from);
    if (query.date_to)   where.created_at[Op.lte] = new Date(query.date_to + "T23:59:59");
  }

  const { count, rows } = await AuditLog.findAndCountAll({
    where,
    include: [{ model: User, attributes: ["id", "email"], required: false }],
    order:  [["created_at", "DESC"]],
    limit,
    offset,
  });

  return {
    logs:        rows,
    total:       count,
    page,
    total_pages: Math.ceil(count / limit),
  };
};

exports.getLogById = async (id) => {
  const log = await AuditLog.findByPk(id);
  if (!log) throw { status: 404, message: "Audit log not found" };
  return log;
};

exports.getLogsByUser = async (userId) => {
  return await AuditLog.findAll({
    where: { user_id: userId },
    order: [["created_at", "DESC"]],
  });
};

exports.getLogsByTable = async (targetTable) => {
  return await AuditLog.findAll({
    where: { target_table: targetTable },
    order: [["created_at", "DESC"]],
  });
};

exports.createLog = async (data) => {
  const { user_id, action, target_table, target_id, old_values, new_values, ip_address } = data;
  return await AuditLog.create({
    user_id,
    action,
    target_table: target_table || null,
    target_id:    target_id   || null,
    old_values:   old_values  || null,
    new_values:   new_values  || null,
    ip_address:   ip_address  || null,
  });
};