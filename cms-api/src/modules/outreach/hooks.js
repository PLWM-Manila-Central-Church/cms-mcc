"use strict";
const logger = require("../../helpers/logger");
const { readiness } = require("./readiness");
const afterSessionChange = (sessionId, transaction) => {
  const schedule = () => queueMicrotask(async () => {
    try {
      if (await readiness()) await require("./scheduler").refreshSession(sessionId);
    } catch { logger.warn("Outreach recovery will retry attendance follow-up evaluation"); }
  });
  if (transaction) {
    if (typeof transaction.afterCommit === "function") transaction.afterCommit(schedule);
  } else schedule();
};
module.exports = { afterSessionChange };
