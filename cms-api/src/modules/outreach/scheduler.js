"use strict";
const logger = require("../../helpers/logger");
const { readiness } = require("./readiness");
const { getConfiguration } = require("./configuration");
const { evaluatePage, evaluateMembers } = require("./evaluation");
const { processQueue } = require("./dispatcher");
const { audienceIds } = require("./repository");
const { QrAttendanceSession } = require("../qr-attendance/models");
let cursor = 0;
let running = null;
let interval = null;
const runCycle = async () => {
  if (running) return { busy: true };
  running = (async () => {
    if (!await readiness()) return { ready: false };
    const result = await evaluatePage({ cursor });
    cursor = result.next_cursor || 0;
    const delivery = await processQueue({ limit: 25 });
    return { evaluation: result, delivery };
  })();
  try { return await running; } finally { running = null; }
};
const refreshSession = async (sessionId) => {
  if (!await readiness()) return;
  const config = await getConfiguration();
  if (!config.enabled) return;
  const session = await QrAttendanceSession.findByPk(sessionId);
  if (!session) return;
  const ids = await audienceIds(session);
  for (let offset = 0; offset < ids.length; offset += 200) await evaluateMembers(ids.slice(offset, offset + 200), config);
  await processQueue({ limit: 25 });
};
const afterSessionChange = (sessionId, transaction) => {
  const schedule = () => {
    queueMicrotask(() => refreshSession(sessionId).catch(() => logger.warn("Outreach recovery will retry an attendance follow-up evaluation")));
  };
  if (transaction?.afterCommit) transaction.afterCommit(schedule);
  else schedule();
};
const startScheduler = () => {
  if (process.env.NODE_ENV === "test" || process.env.OUTREACH_SCHEDULER_ENABLED === "false" || interval) return;
  interval = setInterval(() => runCycle().catch(() => logger.warn("Outreach scheduler check failed; pending work remains in the database")), 60000);
  interval.unref();
};
const stopScheduler = async () => {
  if (interval) clearInterval(interval);
  interval = null;
  if (running) await running.catch(() => {});
};
module.exports = { runCycle, refreshSession, afterSessionChange, startScheduler, stopScheduler };
