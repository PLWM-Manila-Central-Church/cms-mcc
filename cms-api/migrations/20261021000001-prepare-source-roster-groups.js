"use strict";

const CELL_GROUP_RENAMES = [
  { from: "Cell Group 21 Delara", to: "Cell Group 21 Dela Rama", area: "Dela Rama" },
  { from: "Cell Group 23 4TH Estate", to: "Cell Group 23 Fourth Estate", area: "Fourth Estate" },
  { from: "Cell Group 24 BF", to: "Cell Group 24 BF Homes", area: "BF Homes" },
  { from: "Cell Group 32 TS Cruz", to: "Cell Group 32 TS Cruz & Munti", area: "TS Cruz & Munti" },
  { from: "Cell Group 33 Las Pinas", to: "Cell Group 33 Las Piñas", area: "Las Piñas" },
  { from: "Cell Group 51 Lakefront", to: "Cell Group 51 Lakefront A", area: "Lakefront A" },
];

const REQUIRED_CELL_GROUPS = [
  { name: "Cell Group 54 (name pending)", area: "Name pending" },
];

const REQUIRED_MAIN_GROUPS = ["Toddlers"];

const findByName = async (queryInterface, table, name, transaction) => {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT id FROM ${table} WHERE name = ? LIMIT 1`,
    { replacements: [name], transaction },
  );
  return rows[0] || null;
};

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(async (transaction) => {
    const now = new Date();
    const [rosterGroupRows] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS total FROM cell_groups WHERE name LIKE 'Cell Group %'",
      { transaction },
    );
    const hasProductionRosterGroups = Number(rosterGroupRows[0]?.total || 0) > 0;

    // The disposable browser-QA schema contains only QR-specific groups. Do
    // not seed production roster classifications into that fixture database.
    if (!hasProductionRosterGroups && process.env.NODE_ENV !== "production") return;

    for (const rename of CELL_GROUP_RENAMES) {
      const oldGroup = await findByName(queryInterface, "cell_groups", rename.from, transaction);
      const newGroup = await findByName(queryInterface, "cell_groups", rename.to, transaction);

      if (oldGroup && newGroup && Number(oldGroup.id) !== Number(newGroup.id)) {
        throw new Error(`Cannot rename ${rename.from}: ${rename.to} already exists`);
      }
      if (!oldGroup && !newGroup) {
        if (process.env.NODE_ENV === "production") {
          throw new Error(`Cannot align source roster group: ${rename.from} was not found`);
        }
        continue;
      }
      if (oldGroup) {
        await queryInterface.bulkUpdate(
          "cell_groups",
          { name: rename.to, area: rename.area, updated_at: now },
          { id: oldGroup.id },
          { transaction },
        );
      } else {
        await queryInterface.bulkUpdate(
          "cell_groups",
          { area: rename.area, updated_at: now },
          { id: newGroup.id },
          { transaction },
        );
      }
    }

    for (const group of REQUIRED_CELL_GROUPS) {
      const existing = await findByName(queryInterface, "cell_groups", group.name, transaction);
      if (!existing) {
        await queryInterface.bulkInsert("cell_groups", [{
          ...group,
          created_at: now,
          updated_at: now,
        }], { transaction });
      }
    }

    for (const name of REQUIRED_MAIN_GROUPS) {
      const existing = await findByName(queryInterface, "ministry_groups", name, transaction);
      if (!existing) {
        await queryInterface.bulkInsert("ministry_groups", [{
          name,
          created_at: now,
          updated_at: now,
        }], { transaction });
      }
    }
  }),

  // Group rows may be assigned to roster members after this migration. Keep
  // the labels and placeholders on rollback so no member loses its group.
  down: async () => {},
};
