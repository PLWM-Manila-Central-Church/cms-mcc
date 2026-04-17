"use strict";

// ── In-memory permission cache keyed by roleId ────────────────
// Eliminates 2 DB queries (Permission + RolePermission) on every
// protected request. TTL of 10 minutes is safe — role permissions
// change rarely and invalidateAll() is called on any change.
//
// Fix #8 NOTE: This Map-based cache works correctly on a single server
// instance. If the app is ever scaled horizontally (e.g. multiple Railway
// replicas), each instance will have its own isolated cache. A permission
// update on one instance will NOT invalidate the others.
// To fix this for multi-instance deployments, replace this Map with a
// shared Redis cache using ioredis:
//   npm install ioredis
//   const redis = new Redis(process.env.REDIS_URL);
//   exports.get    = async (roleId) => { /* redis.get / redis.set */ };
//   exports.invalidate    = (roleId) => redis.del(`perms:${roleId}`);
//   exports.invalidateAll = ()       => redis.flushdb();

const cache  = new Map();
const TTL_MS = 10 * 60 * 1000; // 10 minutes

exports.get = async (roleId) => {
  const hit = cache.get(roleId);
  if (hit && Date.now() < hit.expiresAt) return hit.permissions;

  const { RolePermission, Permission } = require("../models");
  const rows = await RolePermission.findAll({
    where:   { role_id: roleId },
    include: [{ model: Permission, attributes: ["module", "action"] }],
  });

  const permissions = new Set(rows.map(r => `${r.Permission.module}:${r.Permission.action}`));
  cache.set(roleId, { permissions, expiresAt: Date.now() + TTL_MS });
  return permissions;
};

// Call after any role permission update so the cache rebuilds fresh.
exports.invalidate    = (roleId) => cache.delete(roleId);
exports.invalidateAll = ()       => cache.clear();
