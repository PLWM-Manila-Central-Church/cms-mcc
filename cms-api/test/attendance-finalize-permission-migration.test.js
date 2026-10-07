const migration = require("../migrations/20261008000002-grant-attendance-finalize-to-registrars");

describe("attendance finalization permission migration", () => {
  it("grants finalization only to System Admin and Registration Team", async () => {
    const query = jest.fn().mockResolvedValue([[], []]);
    await migration.up({ sequelize: { query } });

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain("module = 'qr_attendance' AND action = 'finalize'");
    expect(query.mock.calls[1][0]).toContain("role.role_name IN ('System Admin', 'Registration Team')");
    expect(query.mock.calls[1][0]).toContain("NOT EXISTS");
  });

  it("keeps finalization grants forward-only", async () => {
    await expect(migration.down()).rejects.toThrow(/forward-only/);
  });
});
