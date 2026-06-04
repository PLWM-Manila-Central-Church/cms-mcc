"use strict";

/**
 * Simple in-memory cache with TTL support.
 * For multi-instance deployments, swap the store for Redis (ioredis).
 */
const store = new Map();
const DEFAULT_TTL_MS = 60 * 1000; // 60 seconds

exports.get = (key) => {
  const hit = store.get(key);
  if (hit && Date.now() < hit.expiresAt) return hit.value;
  store.delete(key);
  return undefined;
};

exports.set = (key, value, ttlMs = DEFAULT_TTL_MS) => {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
};

exports.del = (key) => store.delete(key);

exports.clear = () => store.clear();

exports.keys = (pattern) => {
  if (!pattern) return [...store.keys()];
  const regex = new RegExp(pattern.replace("*", ".*"));
  return [...store.keys()].filter((k) => regex.test(k));
};
