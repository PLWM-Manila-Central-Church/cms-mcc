"use strict";

const Sequelize = require("sequelize");
const migration = require("../migrations/20261007000002-seed-qr-attendance-permissions");
const { PERMISSIONS } = require("../src/modules/qr-attendance/permissions");

describe("QR attendance permission migration shape", () => {
  it("seeds the default setting using existing system_settings columns", async () => {
    const inserts = [];
    let permissionSelectCount = 0;
    const queryInterface = {
      sequelize: {
        QueryTypes: Sequelize.QueryTypes,
        query: jest.fn(async (sql) => {
          if (sql.includes("FROM permissions WHERE module IN")) {
            permissionSelectCount += 1;
            if (permissionSelectCount === 1) return [];
            return PERMISSIONS.map((permission, index) => ({ ...permission, id: index + 1 }));
          }
          if (sql.includes("FROM system_settings")) return [];
          if (sql.includes("FROM roles")) return [];
          return [];
        }),
      },
      bulkInsert: jest.fn(async (table, rows) => inserts.push({ table, rows })),
    };

    await migration.up(queryInterface);

    const settingInsert = inserts.find(({ table }) => table === "system_settings");
    expect(settingInsert?.rows).toHaveLength(1);
    const setting = settingInsert.rows[0];
    expect(setting).toEqual(expect.objectContaining({
      key: "qr_attendance_enabled",
      value: "false",
      updated_by: null,
      updated_at: expect.any(Date),
    }));
    expect(setting).not.toHaveProperty("created_at");
  });
});
