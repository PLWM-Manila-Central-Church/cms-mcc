const { DataTypes } = require("sequelize");
const migration = require("../migrations/20261022000001-retain-workflow-records-and-calendar-services");

const retainedTables = [
  "notifications",
  "emergency_contacts",
  "ministry_assignments",
  "ministry_memberships",
  "attendance_batch_items",
];

function makeQueryInterface({ partiallyApplied = false } = {}) {
  const columns = new Map();
  const indexes = new Map();
  const stats = { addColumn: [], changeColumn: [], addIndex: [], createTable: [] };

  for (const [index, table] of retainedTables.entries()) {
    const tableColumns = { id: { allowNull: false } };
    if (partiallyApplied && index % 2 === 0) {
      tableColumns.is_deleted = { allowNull: false, defaultValue: 0 };
      tableColumns.deleted_at = { allowNull: true };
    }
    columns.set(table, tableColumns);
    indexes.set(table, partiallyApplied && index === 0
      ? [{ name: `idx_${table}_archive_state`, fields: [{ attribute: "is_deleted" }, { attribute: "deleted_at" }], unique: false }]
      : []);
  }

  columns.set("services", {
    id: { allowNull: false },
    service_time: { allowNull: partiallyApplied },
    capacity: { allowNull: partiallyApplied },
    total_parking_slots: { allowNull: partiallyApplied },
  });
  indexes.set("services", []);
  columns.set("events", { id: { allowNull: false }, total_parking_slots: { allowNull: partiallyApplied, defaultValue: 0 } });
  indexes.set("events", []);

  const queryInterface = {
    describeTable: jest.fn(async (table) => {
      if (!columns.has(table)) throw new Error(`Unknown table ${table}`);
      return { ...columns.get(table) };
    }),
    showIndex: jest.fn(async (table) => [...(indexes.get(table) || [])]),
    showAllTables: jest.fn(async () => [...columns.keys()]),
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
    createTable: jest.fn(async (table, definition) => {
      if (columns.has(table)) throw new Error(`Duplicate table ${table}`);
      columns.set(table, { ...definition });
      indexes.set(table, []);
      stats.createTable.push({ table, definition });
    }),
    sequelize: { query: jest.fn() },
  };

  return { queryInterface, columns, indexes, stats };
}

describe("20261022000001 workflow and calendar schema migration", () => {
  it("resumes safely when archive columns or indexes were applied before a failed migration", async () => {
    const state = makeQueryInterface({ partiallyApplied: true });

    await migration.up(state.queryInterface, DataTypes);

    expect(state.columns.get("services").event_id).toMatchObject({ allowNull: true });
    const eventColumn = state.stats.addColumn.find(({ table, name }) => table === "services" && name === "event_id");
    expect(eventColumn).toBeDefined();
    expect(eventColumn.definition.references).toBeUndefined();
    expect(state.indexes.get("services")).toContainEqual(expect.objectContaining({ name: "uq_services_linked_event", unique: true }));
    expect(state.columns.has("event_image_archives")).toBe(true);
    expect(state.indexes.get("event_image_archives")).toContainEqual(expect.objectContaining({ name: "idx_event_image_archives_state" }));

    const countsAfterFirstRun = Object.fromEntries(Object.entries(state.stats).map(([key, items]) => [key, items.length]));
    await migration.up(state.queryInterface, DataTypes);
    const countsAfterSecondRun = Object.fromEntries(Object.entries(state.stats).map(([key, items]) => [key, items.length]));
    expect(countsAfterSecondRun).toEqual(countsAfterFirstRun);
  });

  it("creates the event link and archive metadata on a fresh schema", async () => {
    const state = makeQueryInterface();

    await migration.up(state.queryInterface, DataTypes);

    expect(state.columns.get("services").event_id).toMatchObject({ allowNull: true });
    for (const table of retainedTables) {
      expect(state.columns.get(table)).toHaveProperty("is_deleted");
      expect(state.columns.get(table)).toHaveProperty("deleted_at");
      expect(state.columns.get(table)).toHaveProperty("deleted_by");
    }
    expect(state.stats.createTable).toHaveLength(1);
  });
});
