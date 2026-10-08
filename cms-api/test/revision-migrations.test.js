"use strict";

const Sequelize = require("sequelize");
const statusMigration = require("../migrations/20261008000003-normalize-member-statuses");
const anonymousGivingMigration = require("../migrations/20261008000004-enable-anonymous-financial-records");
const applicationsMigration = require("../migrations/20261008000005-create-ministry-applications");
const inventoryMigration = require("../migrations/20261008000006-add-inventory-repair-and-context");
const eventImageMigration = require("../migrations/20261008000007-add-event-images-and-analytics-indexes");

describe("revision migrations", () => {
  test("records legacy member statuses before normalizing current status", async () => {
    const query = jest.fn().mockResolvedValue([]);
    const queryInterface = {
      describeTable: jest.fn(async (table) => table === "members" ? { status: { allowNull: false } } : { old_status: {}, new_status: {} }),
      changeColumn: jest.fn(),
      sequelize: { query },
    };
    await statusMigration.up(queryInterface, Sequelize);
    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain("INSERT INTO member_status_history");
    expect(query.mock.calls[1][0]).toContain("UPDATE members SET status = 'Active'");
    expect(queryInterface.changeColumn).toHaveBeenCalledWith("members", "status", expect.objectContaining({ type: Sequelize.ENUM("Active", "Inactive") }));
    await expect(statusMigration.down()).rejects.toThrow(/Restore from a backup/);
  });

  test("adds nullable giver linkage and an anonymous flag without touching existing records", async () => {
    const queryInterface = {
      describeTable: jest.fn(async () => ({ member_id: { allowNull: false } })),
      addColumn: jest.fn(),
      changeColumn: jest.fn(),
    };
    await anonymousGivingMigration.up(queryInterface, Sequelize);
    expect(queryInterface.addColumn).toHaveBeenCalledWith("financial_records", "is_anonymous", expect.objectContaining({ defaultValue: 0, allowNull: false }));
    expect(queryInterface.changeColumn).toHaveBeenCalledWith("financial_records", "member_id", expect.objectContaining({ allowNull: true }));
  });

  test("creates ministry applications with reviewer permissions", async () => {
    const queryInterface = {
      createTable: jest.fn(),
      addIndex: jest.fn(),
      sequelize: { query: jest.fn() },
    };
    await applicationsMigration.up(queryInterface, Sequelize);
    expect(queryInterface.createTable).toHaveBeenCalledWith("ministry_applications", expect.objectContaining({ application_key: expect.any(Object), member_id: expect.any(Object), status: expect.any(Object) }));
    expect(queryInterface.addIndex).toHaveBeenCalledTimes(2);
    expect(queryInterface.sequelize.query).toHaveBeenCalledTimes(4);
  });

  test("adds inventory status, structured links, event images, and analytics indexes", async () => {
    const queryInterface = {
      describeTable: jest.fn(async (table) => table === "inventory_items" ? {} : {}),
      showIndex: jest.fn(async () => []),
      addColumn: jest.fn(),
      addIndex: jest.fn(),
    };
    await inventoryMigration.up(queryInterface, Sequelize);
    expect(queryInterface.addColumn).toHaveBeenCalledWith("inventory_items", "status", expect.objectContaining({ defaultValue: "Available" }));
    expect(queryInterface.addColumn).toHaveBeenCalledWith("inventory_requests", "event_id", expect.objectContaining({ allowNull: true }));
    expect(queryInterface.addColumn).toHaveBeenCalledWith("inventory_requests", "service_id", expect.objectContaining({ allowNull: true }));
    expect(queryInterface.addColumn).toHaveBeenCalledWith("inventory_requests", "ministry_role_id", expect.objectContaining({ allowNull: true }));

    const eventQueryInterface = {
      describeTable: jest.fn(async () => ({})),
      showIndex: jest.fn(async () => []),
      addColumn: jest.fn(),
      addIndex: jest.fn(),
    };
    await eventImageMigration.up(eventQueryInterface, Sequelize);
    expect(eventQueryInterface.addColumn).toHaveBeenCalledWith("events", "image_url", expect.any(Object));
    expect(eventQueryInterface.addColumn).toHaveBeenCalledWith("events", "image_key", expect.any(Object));
    expect(eventQueryInterface.addIndex).toHaveBeenCalledTimes(4);
  });
});
