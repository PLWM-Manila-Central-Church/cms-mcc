const { DataTypes } = require("sequelize");
const migration = require("../migrations/20261022000002-restore-expenses-with-reversible-archives");

const tables = ["funds", "accounts", "expense_categories", "expenses"];

function makeQueryInterface({ partiallyApplied = false } = {}) {
  const columns = new Map();
  const indexes = new Map();
  const stats = { addColumn: [], changeColumn: [], addIndex: [] };

  for (const [position, table] of tables.entries()) {
    const tableColumns = { id: { allowNull: false } };
    if (partiallyApplied && position === 0) {
      tableColumns.is_deleted = { allowNull: false, defaultValue: 0 };
      tableColumns.deleted_at = { allowNull: true };
    } else if (partiallyApplied && position === 1) {
      tableColumns.is_deleted = { allowNull: false, defaultValue: 0 };
      tableColumns.deleted_at = { allowNull: true };
    }
    columns.set(table, tableColumns);
    indexes.set(table, partiallyApplied && position === 1
      ? [{ name: "legacy_accounts_archive_index", fields: [{ attribute: "is_deleted" }, { attribute: "deleted_at" }], unique: false }]
      : []);
  }

  const queryInterface = {
    describeTable: jest.fn(async (table) => {
      if (!columns.has(table)) throw new Error(`Unknown table ${table}`);
      return { ...columns.get(table) };
    }),
    showIndex: jest.fn(async (table) => [...(indexes.get(table) || [])]),
    addColumn: jest.fn(async (table, name, definition) => {
      if (columns.get(table)?.[name]) throw new Error(`Duplicate column ${table}.${name}`);
      columns.get(table)[name] = { ...definition };
      stats.addColumn.push({ table, name, definition });
    }),
    changeColumn: jest.fn(async (table, name, definition) => {
      columns.get(table)[name] = { ...(columns.get(table)[name] || {}), ...definition };
      stats.changeColumn.push({ table, name, definition });
    }),
    addIndex: jest.fn(async (table, definition) => {
      if (indexes.get(table).some((index) => index.name === definition.name)) {
        throw new Error(`Duplicate index ${definition.name}`);
      }
      indexes.get(table).push({ name: definition.name, fields: definition.fields, unique: Boolean(definition.unique) });
      stats.addIndex.push({ table, definition });
    }),
  };

  return { queryInterface, columns, indexes, stats };
}

describe("20261022000002 finance archive migration", () => {
  it("adds archive metadata without a TiDB inline foreign key and is repeatable", async () => {
    const state = makeQueryInterface();

    await migration.up(state.queryInterface, DataTypes);

    for (const table of tables) {
      expect(state.columns.get(table)).toHaveProperty("is_deleted");
      expect(state.columns.get(table)).toHaveProperty("deleted_at");
      expect(state.columns.get(table).deleted_by).toMatchObject({ allowNull: true });
      const deletedByColumn = state.stats.addColumn.find((entry) => entry.table === table && entry.name === "deleted_by");
      expect(deletedByColumn.definition.references).toBeUndefined();
      expect(state.indexes.get(table)).toContainEqual(expect.objectContaining({
        name: `idx_${table}_archive_state`,
        unique: false,
      }));
    }

    const countsAfterFirstRun = Object.fromEntries(Object.entries(state.stats).map(([key, items]) => [key, items.length]));
    await migration.up(state.queryInterface, DataTypes);
    const countsAfterSecondRun = Object.fromEntries(Object.entries(state.stats).map(([key, items]) => [key, items.length]));
    expect(countsAfterSecondRun).toEqual(countsAfterFirstRun);
  });

  it("resumes after some archive columns and indexes were applied", async () => {
    const state = makeQueryInterface({ partiallyApplied: true });

    await migration.up(state.queryInterface, DataTypes);

    expect(state.columns.get("funds").deleted_by).toMatchObject({ allowNull: true });
    expect(state.stats.addColumn.some((entry) => entry.table === "funds" && entry.name === "deleted_by")).toBe(true);
    expect(state.stats.addIndex.some((entry) => entry.table === "accounts")).toBe(false);
    expect(state.stats.addIndex.some((entry) => entry.table === "funds")).toBe(true);
    expect(state.columns.get("accounts")).toHaveProperty("deleted_at");
    expect(state.columns.get("accounts")).toHaveProperty("deleted_by");
    expect(state.columns.get("expenses")).toHaveProperty("is_deleted");

    const countsAfterFirstRun = Object.fromEntries(Object.entries(state.stats).map(([key, items]) => [key, items.length]));
    await migration.up(state.queryInterface, DataTypes);
    const countsAfterSecondRun = Object.fromEntries(Object.entries(state.stats).map(([key, items]) => [key, items.length]));
    expect(countsAfterSecondRun).toEqual(countsAfterFirstRun);
  });
});
