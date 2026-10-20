"use strict";
require("dotenv").config();
const sequelize = require("../src/config/db");
const { readiness } = require("../src/modules/outreach/readiness");
const { evaluatePage } = require("../src/modules/outreach/evaluation");
const { processQueue } = require("../src/modules/outreach/dispatcher");
(async () => {
  if (!await readiness()) throw new Error("Outreach migration is required");
  let cursor = 0;
  do {
    const result = await evaluatePage({ cursor });
    cursor = result.next_cursor || 0;
    console.log(JSON.stringify({ evaluation: result }));
  } while (cursor);
  console.log(JSON.stringify({ delivery: await processQueue({ limit: 100 }) }));
})().catch((error) => { console.error(error.code || "Outreach processing failed"); process.exitCode = 1; })
  .finally(() => sequelize.close());
