"use strict";

require("dotenv").config();

const { QueryTypes } = require("sequelize");
const sequelize = require("../src/config/db");

const checks = [];

const query = (sql, replacements = {}) =>
  sequelize.query(sql, {
    replacements,
    type: QueryTypes.SELECT,
  });

const tableExists = async (tableName) => {
  const rows = await query(
    "SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName",
    { tableName },
  );
  return Number(rows[0]?.count || 0) > 0;
};

const columnExists = async (tableName, columnName) => {
  const rows = await query(
    "SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = :tableName AND COLUMN_NAME = :columnName",
    { tableName, columnName },
  );
  return Number(rows[0]?.count || 0) > 0;
};

const addCheck = (severity, name, rows, detail) => {
  checks.push({ severity, name, count: rows.length, detail });
};

const checkRequiredTable = async (tableName) => {
  const found = await tableExists(tableName);
  addCheck(found ? "PASS" : "FAIL", `required table: ${tableName}`, found ? [] : [{}]);
};

const checkPlannedTable = async (tableName) => {
  const found = await tableExists(tableName);
  addCheck(found ? "PASS" : "WARN", `3NF compatibility table: ${tableName}`, found ? [] : [{}]);
};

const checkPlannedColumn = async (tableName, columnName) => {
  const found = await columnExists(tableName, columnName);
  addCheck(
    found ? "PASS" : "WARN",
    `3NF compatibility column: ${tableName}.${columnName}`,
    found ? [] : [{}],
  );
};

const checkDuplicates = async (name, sql) => {
  const rows = await query(sql);
  addCheck(rows.length ? "FAIL" : "PASS", name, rows, rows.slice(0, 10));
};

const checkOrphans = async (name, sql) => {
  const rows = await query(sql);
  addCheck(rows.length ? "FAIL" : "PASS", name, rows, rows.slice(0, 10));
};

const checkBackfillParity = async () => {
  if (!(await tableExists("ministries"))) return;

  const rows = await query(`
    SELECT
      (SELECT COUNT(*) FROM ministry_roles) AS legacy_count,
      (SELECT COUNT(*) FROM ministries WHERE legacy_ministry_role_id IS NOT NULL) AS normalized_count
  `);
  const row = rows[0] || {};
  const matches = Number(row.legacy_count || 0) === Number(row.normalized_count || 0);
  addCheck(matches ? "PASS" : "FAIL", "ministries backfill parity", matches ? [] : [row], row);
};

const checkArchiveBackfillParity = async () => {
  if (!(await columnExists("archive_versions", "file_size"))) return;
  if (!(await columnExists("archive_records", "current_version_id"))) return;

  const missingSizeRows = await query(`
    SELECT av.id, av.record_id
    FROM archive_versions av
    JOIN archive_records ar ON ar.id = av.record_id
    WHERE ar.file_size IS NOT NULL
      AND av.file_size IS NULL
    LIMIT 20
  `);
  addCheck(
    missingSizeRows.length ? "FAIL" : "PASS",
    "archive version file_size backfill parity",
    missingSizeRows,
    missingSizeRows.slice(0, 10),
  );

  const missingCurrentRows = await query(`
    SELECT ar.id
    FROM archive_records ar
    WHERE EXISTS (
      SELECT 1
      FROM archive_versions av
      WHERE av.record_id = ar.id
    )
      AND ar.current_version_id IS NULL
    LIMIT 20
  `);
  addCheck(
    missingCurrentRows.length ? "FAIL" : "PASS",
    "archive current_version_id backfill parity",
    missingCurrentRows,
    missingCurrentRows.slice(0, 10),
  );
};

const run = async () => {
  const requiredTables = [
    "members",
    "users",
    "ministry_roles",
    "ministry_memberships",
    "ministry_event_invites",
    "ministry_groups",
    "cell_groups",
    "services",
    "attendances",
    "service_responses",
    "events",
    "event_registrations",
    "inventory_items",
    "archive_records",
    "archive_versions",
  ];

  for (const table of requiredTables) {
    await checkRequiredTable(table);
  }

  for (const table of [
    "ministries",
    "ministry_positions",
    "user_leader_assignments",
    "inventory_transactions",
  ]) {
    await checkPlannedTable(table);
  }

  await checkPlannedColumn("archive_versions", "file_size");
  await checkPlannedColumn("archive_records", "current_version_id");

  await checkDuplicates(
    "duplicate attendances by service/member",
    `
      SELECT service_id, member_id, COUNT(*) AS count
      FROM attendances
      GROUP BY service_id, member_id
      HAVING COUNT(*) > 1
      LIMIT 20
    `,
  );

  await checkDuplicates(
    "duplicate service responses by service/member",
    `
      SELECT service_id, member_id, COUNT(*) AS count
      FROM service_responses
      GROUP BY service_id, member_id
      HAVING COUNT(*) > 1
      LIMIT 20
    `,
  );

  await checkDuplicates(
    "duplicate event registrations by event/member",
    `
      SELECT event_id, member_id, COUNT(*) AS count
      FROM event_registrations
      GROUP BY event_id, member_id
      HAVING COUNT(*) > 1
      LIMIT 20
    `,
  );

  await checkOrphans(
    "members with missing cell group",
    `
      SELECT m.id, m.cell_group_id
      FROM members m
      LEFT JOIN cell_groups cg ON cg.id = m.cell_group_id
      WHERE m.cell_group_id IS NOT NULL
        AND cg.id IS NULL
      LIMIT 20
    `,
  );

  await checkOrphans(
    "members with missing member group",
    `
      SELECT m.id, m.group_id
      FROM members m
      LEFT JOIN ministry_groups mg ON mg.id = m.group_id
      WHERE m.group_id IS NOT NULL
        AND mg.id IS NULL
      LIMIT 20
    `,
  );

  await checkOrphans(
    "users with missing ministry leader scope",
    `
      SELECT u.id, u.leads_ministry_id
      FROM users u
      LEFT JOIN ministry_roles mr ON mr.id = u.leads_ministry_id
      WHERE u.leads_ministry_id IS NOT NULL
        AND mr.id IS NULL
      LIMIT 20
    `,
  );

  await checkOrphans(
    "users with missing cell group leader scope",
    `
      SELECT u.id, u.leads_cell_group_id
      FROM users u
      LEFT JOIN cell_groups cg ON cg.id = u.leads_cell_group_id
      WHERE u.leads_cell_group_id IS NOT NULL
        AND cg.id IS NULL
      LIMIT 20
    `,
  );

  await checkOrphans(
    "users with missing member group leader scope",
    `
      SELECT u.id, u.leads_group_id
      FROM users u
      LEFT JOIN ministry_groups mg ON mg.id = u.leads_group_id
      WHERE u.leads_group_id IS NOT NULL
        AND mg.id IS NULL
      LIMIT 20
    `,
  );

  await checkBackfillParity();
  await checkArchiveBackfillParity();

  let hasFailure = false;
  console.log("\n3NF compatibility validation\n");
  for (const check of checks) {
    const suffix = check.count ? ` (${check.count})` : "";
    console.log(`[${check.severity}] ${check.name}${suffix}`);
    if (check.detail && check.count) {
      console.log(JSON.stringify(check.detail, null, 2));
    }
    if (check.severity === "FAIL") hasFailure = true;
  }

  await sequelize.close();
  process.exit(hasFailure ? 1 : 0);
};

run().catch(async (error) => {
  console.error(error);
  await sequelize.close().catch(() => {});
  process.exit(1);
});
