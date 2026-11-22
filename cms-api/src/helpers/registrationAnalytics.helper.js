"use strict";

const pad = (value) => String(value).padStart(2, "0");
const isoDate = (date) => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

const fillRate = (registered, capacity) => {
  if (!capacity || capacity <= 0) return null;
  return Math.min(100, Math.round((Number(registered) || 0) / capacity * 1000) / 10);
};

const attendanceRate = (present, capacity) => {
  if (!capacity || capacity <= 0) return null;
  return Math.min(100, Math.round((Number(present) || 0) / capacity * 1000) / 10);
};

const dayRange = (from, to) => {
  const days = [];
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  for (let cursor = start; cursor <= end; cursor = new Date(cursor.getTime() + 86400000)) {
    days.push(isoDate(cursor));
  }
  return days;
};

const cumulativeSeries = (registrations, { from, to }) => {
  const days = dayRange(from, to);
  const counts = new Map();
  for (const row of registrations) {
    const date = String(row.registered_at || "").slice(0, 10);
    if (!date) continue;
    counts.set(date, (counts.get(date) || 0) + 1);
  }
  let running = 0;
  return days.map((date) => {
    running += counts.get(date) || 0;
    return { date, total: counts.get(date) || 0, cumulative: running };
  });
};

const sumBy = (rows, pick) => rows.reduce((total, row) => total + (Number(pick(row)) || 0), 0);

module.exports = { fillRate, attendanceRate, dayRange, cumulativeSeries, sumBy };
