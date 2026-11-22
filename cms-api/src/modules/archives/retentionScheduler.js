"use strict";

const retention = require("../../services/archiveRetention.service");

const DAY_MS = 24 * 60 * 60 * 1000;
let timer = null;
let firstRun = null;

const run = async () => {
  try {
    if (!(await retention.isAutoPurgeEnabled())) return { skipped: "disabled" };
    const result = await retention.purgeDue({});
    if (result.documents || result.system_records) {
      console.log(`[archive-retention] purged ${result.documents} documents, ${result.system_records} system records`);
    }
    return result;
  } catch (error) {
    console.error("[archive-retention] purge failed:", error.message);
    return { error: error.message };
  }
};

exports.startArchiveRetention = () => {
  if (timer) return;
  firstRun = setTimeout(() => { run(); }, 60 * 1000);
  timer = setInterval(() => { run(); }, DAY_MS);
  timer.unref?.();
  firstRun.unref?.();
};

exports.stopArchiveRetention = () => {
  if (timer) clearInterval(timer);
  if (firstRun) clearTimeout(firstRun);
  timer = null;
  firstRun = null;
};

exports.runArchiveRetentionNow = run;
