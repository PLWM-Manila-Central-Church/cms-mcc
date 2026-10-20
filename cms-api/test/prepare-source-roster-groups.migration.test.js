"use strict";

const migration = require("../migrations/20261021000001-prepare-source-roster-groups");

const makeQueryInterface = ({ hasRosterGroups }) => {
  const updates = [];
  const inserts = [];
  const cellNames = new Set([
    "Cell Group 21 Delara", "Cell Group 23 4TH Estate", "Cell Group 24 BF",
    "Cell Group 32 TS Cruz", "Cell Group 33 Las Pinas", "Cell Group 51 Lakefront",
  ]);
  const mainNames = new Set();
  let nextId = 1;

  return {
    updates,
    inserts,
    sequelize: {
      query: jest.fn(async (sql, options = {}) => {
        if (sql.includes("COUNT(*) AS total FROM cell_groups")) {
          return [[{ total: hasRosterGroups ? 17 : 0 }], {}];
        }
        const [name] = options.replacements || [];
        const isCellGroup = sql.includes("FROM cell_groups");
        const exists = isCellGroup ? cellNames.has(name) : mainNames.has(name);
        return [exists ? [{ id: nextId++ }] : [], {}];
      }),
      transaction: jest.fn(async (callback) => callback({ id: "test-transaction" })),
    },
    bulkUpdate: jest.fn(async (table, values, where) => {
      updates.push({ table, values, where });
    }),
    bulkInsert: jest.fn(async (table, rows) => {
      inserts.push({ table, rows });
    }),
  };
};

describe("source roster group preparation migration", () => {
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
  });

  test("aligns production cell-group labels and adds missing group classifications", async () => {
    process.env.NODE_ENV = "production";
    const queryInterface = makeQueryInterface({ hasRosterGroups: true });

    await migration.up(queryInterface);

    expect(queryInterface.updates).toHaveLength(6);
    expect(queryInterface.updates[0]).toMatchObject({
      table: "cell_groups",
      values: { name: "Cell Group 21 Dela Rama", area: "Dela Rama" },
      where: { id: expect.any(Number) },
    });
    expect(queryInterface.inserts).toHaveLength(2);
    expect(queryInterface.inserts).toEqual(expect.arrayContaining([
      expect.objectContaining({ table: "cell_groups", rows: [expect.objectContaining({ name: "Cell Group 54 (name pending)" })] }),
      expect.objectContaining({ table: "ministry_groups", rows: [expect.objectContaining({ name: "Toddlers" })] }),
    ]));
  });

  test("leaves QR-only isolated QA group fixtures unchanged", async () => {
    process.env.NODE_ENV = "test";
    const queryInterface = makeQueryInterface({ hasRosterGroups: false });

    await migration.up(queryInterface);

    expect(queryInterface.updates).toHaveLength(0);
    expect(queryInterface.inserts).toHaveLength(0);
  });
});
