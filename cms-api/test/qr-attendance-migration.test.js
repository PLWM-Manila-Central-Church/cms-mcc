"use strict";

const Sequelize = require("sequelize");
const migration = require("../migrations/20261007000001-create-qr-attendance-schema");

describe("QR attendance schema migration shape", () => {
  it("creates the planned tables and required compatibility columns exactly once", async () => {
    const tables = new Map([[
      "attendances",
      { id: {}, service_id: {}, member_id: {}, check_in_method: {}, checked_in_at: {} },
    ]]);
    const indexes = [];
    const constraints = [];
    const queryInterface = {
      createTable: jest.fn(async (name, columns) => { tables.set(name, columns); }),
      addColumn: jest.fn(async (name, column, definition) => { tables.get(name)[column] = definition; }),
      addIndex: jest.fn(async (name, options) => { indexes.push({ table: name, ...options }); }),
      addConstraint: jest.fn(async (name, options) => { constraints.push({ table: name, ...options }); }),
    };

    await migration.up(queryInterface, Sequelize);

    expect([...tables.keys()]).toEqual(expect.arrayContaining([
      "attendance_sessions",
      "member_qr_credentials",
      "attendance_expected_members",
      "attendance_batches",
      "attendance_batch_items",
      "event_attendances",
    ]));
    expect(tables.get("event_attendances").version).toBeDefined();
    expect(tables.get("attendance_expected_members").version).toBeUndefined();
    expect(tables.get("attendance_batches").version).toBeUndefined();
    expect(Object.keys(tables.get("attendances")).filter((column) => column === "qr_revision")).toHaveLength(1);
    expect(tables.get("attendances").confirmed_by).toBeDefined();
    expect(tables.get("attendances").confirmed_at).toBeDefined();
    expect(constraints.some((constraint) => constraint.name === "fk_attendance_qr_confirmed_by")).toBe(true);
    expect(indexes.some((index) => index.name === "idx_attendance_confirmed_service_time")).toBe(true);
  });
});
