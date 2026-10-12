"use strict";

const migration = require("../migrations/20261011000002-separate-event-registration-permissions");

describe("event registration permissions migration", () => {
  test("separates staff attendee management from event and ministry write grants", async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);

    await migration.up({ sequelize: { query } });

    expect(query).toHaveBeenCalledTimes(5);
    expect(query.mock.calls[0][0]).toContain("'event_registrations', :action");
    expect(query.mock.calls[1][0]).toContain("'event_registrations', :action");
    expect(query.mock.calls[2][0]).toContain("r.role_name = 'Registration Team'");
    expect(query.mock.calls[2][0]).toContain("p.action IN ('create', 'delete')");
    expect(query.mock.calls[3][0]).toContain("p.module = 'events' AND p.action IN ('create', 'update', 'delete')");
    expect(query.mock.calls[3][0]).toContain("p.module = 'ministry' AND p.action IN ('create', 'update', 'delete')");
    expect(query.mock.calls[4][0]).toContain("r.role_name = 'Member'");
    expect(query.mock.calls[4][0]).toContain("p.action IN ('create', 'update', 'delete')");
  });

  test("does not provide a rollback that restores broad legacy write grants", async () => {
    await expect(migration.down()).rejects.toThrow(/Forward-only security migration/);
  });
});
