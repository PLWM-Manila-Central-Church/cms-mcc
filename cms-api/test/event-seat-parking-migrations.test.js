"use strict";

const { Sequelize } = require("sequelize");
const reservationMigration = require("../migrations/20261011000007-add-event-seat-and-parking-reservations");
const permissionMigration = require("../migrations/20261011000008-add-event-registration-reservation-update-permission");

describe("Event seat and parking migrations", () => {
  test("adds nullable assignment fields, a disabled-by-default parking limit, and unique slot indexes", async () => {
    const query = jest.fn().mockResolvedValue([]);
    const queryInterface = {
      sequelize: { query, QueryTypes: { SELECT: "SELECT" } },
      addColumn: jest.fn().mockResolvedValue(undefined),
      addIndex: jest.fn().mockResolvedValue(undefined),
    };

    await reservationMigration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith("events", "total_parking_slots", expect.objectContaining({
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    }));
    expect(queryInterface.addColumn).toHaveBeenCalledWith("event_registrations", "seat_number", expect.objectContaining({
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    }));
    expect(queryInterface.addColumn).toHaveBeenCalledWith("event_registrations", "parking_slot", expect.objectContaining({
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    }));
    expect(queryInterface.addIndex).toHaveBeenCalledWith("event_registrations", expect.objectContaining({
      fields: ["event_id", "seat_number"],
      unique: true,
    }));
    expect(queryInterface.addIndex).toHaveBeenCalledWith("event_registrations", expect.objectContaining({
      fields: ["event_id", "parking_slot"],
      unique: true,
    }));
  });

  test("is safe to retry when the columns and indexes already exist", async () => {
    const query = jest.fn().mockResolvedValue([{ INDEX_NAME: "present" }]);
    const queryInterface = {
      sequelize: { query, QueryTypes: { SELECT: "SELECT" } },
      addColumn: jest.fn(),
      addIndex: jest.fn(),
    };

    await reservationMigration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).not.toHaveBeenCalled();
    expect(queryInterface.addIndex).not.toHaveBeenCalled();
  });

  test("keeps the reservation schema forward-only", async () => {
    await expect(reservationMigration.down()).rejects.toThrow(/forward-only/i);
  });
});

describe("event reservation update permission migration", () => {
  test("creates the permission and grants it only to System Admin and Registration Team", async () => {
    const query = jest.fn().mockResolvedValue([[], {}]);
    const queryInterface = { sequelize: { query } };

    await permissionMigration.up(queryInterface);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain("'event_registrations', 'update'");
    expect(query.mock.calls[1][0]).toContain("r.role_name IN ('System Admin', 'Registration Team')");
  });

  test("does not restore broader registration permissions on rollback", async () => {
    await expect(permissionMigration.down()).rejects.toThrow(/forward-only/i);
  });
});
