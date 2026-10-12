"use strict";

const { Sequelize } = require("sequelize");
const migration = require("../migrations/20261012000001-link-refresh-tokens-to-user-sessions");

describe("refresh token and user session link migration", () => {
  test("adds a nullable indexed session link and a set-null foreign key", async () => {
    const query = jest.fn(async (sql) => {
      if (sql === "SHOW INDEX FROM refresh_tokens") return [[], {}];
      if (sql.includes("INFORMATION_SCHEMA.KEY_COLUMN_USAGE")) return [[], {}];
      return [[], {}];
    });
    const queryInterface = {
      sequelize: { query },
      describeTable: jest.fn().mockResolvedValue({ id: {}, user_id: {}, token: {} }),
      addColumn: jest.fn().mockResolvedValue(undefined),
      addIndex: jest.fn().mockResolvedValue(undefined),
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith("refresh_tokens", "user_session_id", expect.objectContaining({
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    }));
    expect(queryInterface.addIndex).toHaveBeenCalledWith("refresh_tokens", ["user_session_id"], {
      name: "idx_refresh_tokens_user_session_id",
    });
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ON DELETE SET NULL ON UPDATE CASCADE"));
  });

  test("is safe to retry when the link, index, and foreign key already exist", async () => {
    const query = jest.fn(async (sql) => {
      if (sql === "SHOW INDEX FROM refresh_tokens") return [[{ Key_name: "idx_refresh_tokens_user_session_id" }], {}];
      if (sql.includes("INFORMATION_SCHEMA.KEY_COLUMN_USAGE")) {
        return [[{ CONSTRAINT_NAME: "fk_refresh_tokens_user_session" }], {}];
      }
      return [[], {}];
    });
    const queryInterface = {
      sequelize: { query },
      describeTable: jest.fn().mockResolvedValue({ id: {}, user_id: {}, user_session_id: {}, token: {} }),
      addColumn: jest.fn(),
      addIndex: jest.fn(),
    };

    await migration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).not.toHaveBeenCalled();
    expect(queryInterface.addIndex).not.toHaveBeenCalled();
    expect(query).not.toHaveBeenCalledWith(expect.stringContaining("ALTER TABLE"));
  });

  test("prevents rollback from silently discarding session audit links", async () => {
    await expect(migration.down()).rejects.toThrow(/forward-only/i);
  });
});
