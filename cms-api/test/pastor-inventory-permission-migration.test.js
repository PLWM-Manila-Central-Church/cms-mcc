"use strict";

const migration = require("../migrations/20261011000003-remove-pastor-inventory-create-permission");

describe("Pastor inventory write permission migration", () => {
  test("removes the write-only inventory:create grant from Pastor", async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);
    await migration.up({ sequelize: { query } });

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain("r.role_name = 'Pastor'");
    expect(query.mock.calls[0][0]).toContain("p.module = 'inventory'");
    expect(query.mock.calls[0][0]).toContain("p.action = 'create'");
  });

  test("does not restore the legacy write-only grant on rollback", async () => {
    await expect(migration.down()).rejects.toThrow(/Forward-only least-privilege migration/);
  });
});
