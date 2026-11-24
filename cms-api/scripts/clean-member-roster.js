"use strict";

const { QueryTypes } = require("sequelize");
const sequelize = require("../src/config/db");
const { archiveMember } = require("../src/services/members.service");
const { isSafeQrTestTarget } = require("./qr-test-target");

async function main() {
  const apply = process.argv.includes("--apply");
  const actorId = Number(process.env.ROSTER_ACTOR_ID);
  const rows = await sequelize.query(
    `SELECT m.id, u.id AS linked_login, u.leads_cell_group_id, u.leads_ministry_id, u.leads_group_id,
      EXISTS (SELECT 1 FROM user_leader_assignments a WHERE a.user_id = u.id AND a.is_active = 1) AS assigned_leader
    FROM members m LEFT JOIN users u ON u.member_id = m.id AND u.is_deleted = 0
    WHERE m.is_deleted = 0 AND m.status = 'Inactive' ORDER BY m.id`,
    { type: QueryTypes.SELECT },
  );
  const eligible = await sequelize.query(
    "SELECT COUNT(*) AS total FROM members WHERE is_deleted = 0 AND status = 'Active' AND join_date IS NULL AND import_batch IS NOT NULL AND estimated_join_date IS NULL",
    { type: QueryTypes.SELECT },
  );
  const members = new Set(rows.map((row) => row.id));
  console.log(JSON.stringify({
    mode: apply ? "apply" : "preview", inactiveProfiles: members.size,
    linkedLogins: new Set(rows.map((row) => row.linked_login).filter(Boolean)).size,
    linkedLeaderProfiles: new Set(rows.filter((row) => row.leads_cell_group_id || row.leads_ministry_id || row.leads_group_id || Number(row.assigned_leader)).map((row) => row.id)).size,
    missingImportDates: Number(eligible[0].total),
  }));
  if (!apply) return;
  if (!isSafeQrTestTarget() && process.env.ROSTER_CONFIRM_DATABASE !== sequelize.config.database) {
    throw new Error("Set ROSTER_CONFIRM_DATABASE after reviewing the roster preview for the target database.");
  }
  const actors = await sequelize.query(
    "SELECT u.id FROM users u JOIN roles r ON r.id = u.role_id WHERE u.id = :actorId AND u.is_active = 1 AND u.is_deleted = 0 AND r.role_name = 'System Admin'",
    { replacements: { actorId: actorId || 0 }, type: QueryTypes.SELECT },
  );
  if (!actors.length) throw new Error("A valid System Admin ROSTER_ACTOR_ID is required.");
  for (const id of members) {
    const result = await archiveMember(id, actorId, "Inactive roster cleanup", { roleName: "System Admin" }, { inactiveOnly: true });
    console.log(JSON.stringify({ memberId: id, action: result.skipped ? "skipped" : "archived" }));
  }
  const [, affected] = await sequelize.query(
    `UPDATE members SET estimated_join_date =
      ADDDATE('2024-01-01', MOD(CRC32(CONCAT('mcc-join-date:', id)), DATEDIFF('2026-11-24', '2024-01-01') + 1))
    WHERE is_deleted = 0 AND status = 'Active' AND join_date IS NULL AND import_batch IS NOT NULL AND estimated_join_date IS NULL`,
    { type: QueryTypes.UPDATE },
  );
  console.log(JSON.stringify({ estimatedDatesAssigned: affected }));
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; }).finally(() => sequelize.close());
