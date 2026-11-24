"use strict";

const sequelize = require("../src/config/db");
const { MinistryGroup, Member, User, Role } = require("../src/models");

const directory = [
  { name: "Church School Teachers", included: ["High School Group", "Elementary Group"] },
  { name: "Young Adult Leader", aliases: ["Young Adults"] },
  { name: "Women's Group Leader", aliases: ["Women's"] },
  { name: "Men's Group Leader", aliases: ["Men's"] },
  { name: "Broadcasting Team" },
  { name: "Choir Team" },
  { name: "Facility and Maintenance Team" },
  { name: "Art Team" },
  { name: "Deaf Ministry" },
  { name: "Usherette/Welcoming Team" },
  { name: "Main Hall Coordinator" },
  { name: "Marshal" },
];

async function replaceDirectory({ apply, actorId, transaction }) {
  const rows = await MinistryGroup.findAll({
    order: [["id", "ASC"]],
    transaction,
    ...(apply ? { lock: transaction.LOCK.UPDATE } : {}),
  });
  const byName = new Map(rows.map((row) => [row.name.trim().toLowerCase(), row]));
  const keep = new Set();
  const changes = [];

  for (const entry of directory) {
    const existing = [entry.name, ...(entry.aliases || [])]
      .map((name) => byName.get(name.toLowerCase()))
      .filter(Boolean);
    if (existing.length > 1) throw new Error(`Multiple existing records match ${entry.name}.`);
    const [row] = existing;
    if (row) keep.add(row.id);
    const description = entry.included
      ? `Includes ${entry.included.join(" and ")}.`
      : row?.description ?? null;
    const fields = { name: entry.name, description, status: "Active", is_deleted: 0, deleted_at: null, deleted_by: null };
    let action = "create";
    if (row) {
      const changed = Object.entries(fields).some(([key, value]) => row[key] !== value);
      action = changed ? "update" : "keep";
    }
    changes.push({ action, id: row?.id, previousName: row?.name, name: entry.name, included: entry.included });
    if (apply && action === "create") await MinistryGroup.create(fields, { transaction });
    if (apply && action === "update") await row.update(fields, { transaction });
  }

  for (const row of rows.filter((item) => !Number(item.is_deleted) && !keep.has(item.id))) {
    const linkedMembers = await Member.count({ where: { group_id: row.id, is_deleted: 0 }, transaction });
    changes.push({
      action: "archive", id: row.id, name: row.name, linkedMembers,
      leaderAssigned: Boolean(row.leader_user_id || row.assistant_leader_user_id),
    });
    if (apply) await row.update({
      status: "Archived", is_deleted: 1, deleted_at: new Date(), deleted_by: actorId,
    }, { transaction });
  }
  return changes;
}

async function main() {
  const apply = process.argv.includes("--apply");
  const actorId = Number(process.env.MINISTRY_DIRECTORY_ACTOR_ID);
  if (apply && (!actorId || !sequelize.config.database ||
    process.env.MINISTRY_DIRECTORY_CONFIRM_DATABASE !== sequelize.config.database)) {
    throw new Error("Set MINISTRY_DIRECTORY_ACTOR_ID and confirm the reviewed target with MINISTRY_DIRECTORY_CONFIRM_DATABASE.");
  }
  const changes = await sequelize.transaction(async (transaction) => {
    if (apply) {
      const admin = await Role.findOne({ where: { role_name: "System Admin" }, transaction });
      const actor = admin && await User.findOne({
        where: { id: actorId, role_id: admin.id, is_active: 1, is_deleted: 0 },
        transaction,
      });
      if (!actor) throw new Error("An active System Admin actor is required.");
    }
    return replaceDirectory({ apply, actorId, transaction });
  });
  console.log(JSON.stringify({ mode: apply ? "applied" : "preview", changes }, null, 2));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error.original?.code || error.name);
    process.exitCode = 1;
  }).finally(() => sequelize.close());
}
