"use strict";

const Sequelize = require("sequelize");
const migration = require("../migrations/20261007000003-ensure-event-registration-registered-by-fk");

const makeQueryInterface = (queryResults) => {
  const sequelize = {
    QueryTypes: { SELECT: "SELECT" },
    query: jest.fn(async () => queryResults.shift() || []),
  };
  return {
    sequelize,
    addColumn: jest.fn(async () => {}),
    addConstraint: jest.fn(async () => {}),
  };
};

describe("event registration TiDB compatibility migration", () => {
  test("adds the column before its foreign key when either is missing", async () => {
    const queryInterface = makeQueryInterface([[], []]);

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith("event_registrations", "registered_by", expect.objectContaining({
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    }));
    expect(queryInterface.addConstraint).toHaveBeenCalledWith("event_registrations", expect.objectContaining({
      fields: ["registered_by"],
      type: "foreign key",
      name: "fk_event_registrations_registered_by",
      references: { table: "users", field: "id" },
    }));
    expect(queryInterface.addColumn.mock.invocationCallOrder[0]).toBeLessThan(
      queryInterface.addConstraint.mock.invocationCallOrder[0],
    );
  });

  test("leaves an existing column and foreign key unchanged", async () => {
    const queryInterface = makeQueryInterface([[{ COLUMN_NAME: "registered_by" }], [{ CONSTRAINT_NAME: "fk_registered_by" }]]);

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).not.toHaveBeenCalled();
    expect(queryInterface.addConstraint).not.toHaveBeenCalled();
  });

  test("prevents rollback from removing this compatibility repair", async () => {
    await expect(migration.down()).rejects.toThrow(/forward-only/);
  });
});
