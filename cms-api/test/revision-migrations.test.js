"use strict";

const Sequelize = require("sequelize");
const statusMigration = require("../migrations/20261008000003-normalize-member-statuses");
const anonymousGivingMigration = require("../migrations/20261008000004-enable-anonymous-financial-records");
const duplicateFinancialMemberFkMigration = require("../migrations/20261011000004-deduplicate-financial-record-member-fk");
const memberGivingIndexMigration = require("../migrations/20261011000005-optimize-member-giving-date-index");
const notificationFeedIndexMigration = require("../migrations/20261011000006-optimize-notification-user-feed-index");
const applicationsMigration = require("../migrations/20261008000005-create-ministry-applications");
const inventoryMigration = require("../migrations/20261008000006-add-inventory-repair-and-context");
const eventImageMigration = require("../migrations/20261008000007-add-event-images-and-analytics-indexes");
const inventoryAvailabilityMigration = require("../migrations/20261008000008-expand-inventory-availability-statuses");
const refreshTokenRotationMigration = require("../migrations/20261009000001-improve-refresh-token-rotation");
const financeTeamAccessMigration = require("../migrations/20261009000002-grant-finance-team-core-access");
const financialCategoriesMigration = require("../migrations/20261009000003-seed-financial-categories");
const anonymousMemberNullabilityMigration = require("../migrations/20261009000004-allow-null-anonymous-financial-members");
const inventoryRequestReviewNoteMigration = require("../migrations/20261009000005-add-inventory-request-review-note");
const inventoryRequestIdempotencyMigration = require("../migrations/20261011000001-add-inventory-request-idempotency-key");
const financeArchiveAccessMigration = require("../migrations/20261010000001-ensure-archive-categories-and-finance-access");
const archiveRoleAccessMigration = require("../migrations/20261010000002-ensure-archive-role-access");

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

  test("removes duplicate financial member foreign keys while keeping the original constraint", async () => {
    const duplicate = [
      { constraint_name: "fk_1", referenced_table_name: "members", referenced_column_name: "id" },
      { constraint_name: "fk_5", referenced_table_name: "members", referenced_column_name: "id" },
    ];
    const query = jest.fn(async (sql) => {
      if (!String(sql).includes("ALTER TABLE")) return query.mock.calls.length === 1 ? duplicate : [duplicate[0]];
      return [];
    });
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ member_id: { allowNull: true } }),
      addConstraint: jest.fn(),
      sequelize: { QueryTypes: { SELECT: "SELECT" }, query },
    };

    await duplicateFinancialMemberFkMigration.up(queryInterface);

    expect(query).toHaveBeenCalledWith(
      "ALTER TABLE `financial_records` DROP FOREIGN KEY `fk_5`",
    );
    expect(queryInterface.addConstraint).not.toHaveBeenCalled();
    await expect(duplicateFinancialMemberFkMigration.down()).rejects.toThrow(/intentionally irreversible/);
  });

  test("leaves a single existing financial member foreign key unchanged", async () => {
    const single = [{ constraint_name: "fk_1", referenced_table_name: "members", referenced_column_name: "id" }];
    const query = jest.fn().mockResolvedValue(single);
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ member_id: { allowNull: true } }),
      addConstraint: jest.fn(),
      sequelize: { QueryTypes: { SELECT: "SELECT" }, query },
    };

    await duplicateFinancialMemberFkMigration.up(queryInterface);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query).toHaveBeenNthCalledWith(1, expect.stringContaining("INFORMATION_SCHEMA.KEY_COLUMN_USAGE"), { type: "SELECT" });
    expect(queryInterface.addConstraint).not.toHaveBeenCalled();
  });

  test("restores a missing financial member foreign key when no orphan links exist", async () => {
    const canonical = [{ constraint_name: "fk_financial_records_member_id", referenced_table_name: "members", referenced_column_name: "id" }];
    const query = jest.fn(async (sql) => {
      if (String(sql).includes("SELECT COUNT(*) AS count")) return [{ count: 0 }];
      return query.mock.calls.length === 1 ? [] : canonical;
    });
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ member_id: { allowNull: true } }),
      addConstraint: jest.fn().mockResolvedValue(undefined),
      sequelize: { QueryTypes: { SELECT: "SELECT" }, query },
    };

    await duplicateFinancialMemberFkMigration.up(queryInterface);

    expect(queryInterface.addConstraint).toHaveBeenCalledWith("financial_records", expect.objectContaining({
      fields: ["member_id"],
      type: "foreign key",
      name: "fk_financial_records_member_id",
      references: { table: "members", field: "id" },
    }));
  });

  test("refuses to restore a missing finance member foreign key when orphan references exist", async () => {
    const query = jest.fn(async (sql) => String(sql).includes("SELECT COUNT(*) AS count") ? [{ count: 1 }] : []);
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ member_id: { allowNull: true } }),
      addConstraint: jest.fn(),
      sequelize: { QueryTypes: { SELECT: "SELECT" }, query },
    };

    await expect(duplicateFinancialMemberFkMigration.up(queryInterface)).rejects.toThrow(/orphaned member_id values/);
    expect(queryInterface.addConstraint).not.toHaveBeenCalled();
  });

  test("adds the Member giving date index before removing its redundant prefix index", async () => {
    let indexes = [
      { name: "fk_1", fields: [{ attribute: "member_id" }] },
      { name: "idx_financial_records_member_deleted", fields: [{ attribute: "member_id" }, { attribute: "is_deleted" }] },
    ];
    const calls = [];
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ member_id: {}, is_deleted: {}, transaction_date: {} }),
      showIndex: jest.fn(async () => indexes),
      addIndex: jest.fn(async (table, fields, options) => {
        calls.push(`add:${options.name}`);
        indexes = [...indexes, { name: options.name, fields: fields.map((attribute) => ({ attribute })) }];
      }),
      removeIndex: jest.fn(async (_table, name) => {
        calls.push(`remove:${name}`);
        indexes = indexes.filter((index) => index.name !== name);
      }),
    };

    await memberGivingIndexMigration.up(queryInterface);

    expect(calls).toEqual([
      "add:idx_financial_records_member_deleted_date",
      "remove:idx_financial_records_member_deleted",
    ]);
    expect(indexes.find((index) => index.name === "fk_1")).toBeDefined();
    expect(indexes.find((index) => index.name === "idx_financial_records_member_deleted_date").fields.map((field) => field.attribute))
      .toEqual(["member_id", "is_deleted", "transaction_date"]);
    expect(indexes.some((index) => index.name === "idx_financial_records_member_deleted")).toBe(false);
  });

  test("is idempotent when the optimized Member giving index already exists", async () => {
    const indexes = [
      { name: "fk_1", fields: [{ attribute: "member_id" }] },
      { name: "idx_financial_records_member_deleted_date", fields: [{ attribute: "member_id" }, { attribute: "is_deleted" }, { attribute: "transaction_date" }] },
    ];
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ member_id: {}, is_deleted: {}, transaction_date: {} }),
      showIndex: jest.fn().mockResolvedValue(indexes),
      addIndex: jest.fn(),
      removeIndex: jest.fn(),
    };

    await memberGivingIndexMigration.up(queryInterface);

    expect(queryInterface.addIndex).not.toHaveBeenCalled();
    expect(queryInterface.removeIndex).not.toHaveBeenCalled();
  });

  test("down migration restores the prefix index and removes the Member giving index", async () => {
    let indexes = [
      { name: "fk_1", fields: [{ attribute: "member_id" }] },
      { name: "idx_financial_records_member_deleted_date", fields: [{ attribute: "member_id" }, { attribute: "is_deleted" }, { attribute: "transaction_date" }] },
    ];
    const calls = [];
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ member_id: {}, is_deleted: {}, transaction_date: {} }),
      showIndex: jest.fn(async () => indexes),
      addIndex: jest.fn(async (table, fields, options) => {
        calls.push(`add:${options.name}`);
        indexes.push({ name: options.name, fields: fields.map((attribute) => ({ attribute })) });
      }),
      removeIndex: jest.fn(async (_table, name) => {
        calls.push(`remove:${name}`);
        indexes = indexes.filter((index) => index.name !== name);
      }),
    };

    await memberGivingIndexMigration.down(queryInterface);

    expect(indexes.some((index) => index.name === "idx_financial_records_member_deleted_date")).toBe(false);
    expect(indexes.find((index) => index.name === "idx_financial_records_member_deleted").fields.map((field) => field.attribute))
      .toEqual(["member_id", "is_deleted"]);
    expect(calls).toEqual([
      "add:idx_financial_records_member_deleted",
      "remove:idx_financial_records_member_deleted_date",
    ]);
  });

  test("adds a user-and-created-time index for ordered notification feeds idempotently", async () => {
    let indexes = [{ name: "idx_notifications_user_read", fields: [{ attribute: "user_id" }, { attribute: "is_read" }] }];
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ user_id: {}, created_at: {} }),
      showIndex: jest.fn(async () => indexes),
      addIndex: jest.fn(async (table, fields, options) => {
        indexes = [...indexes, { name: options.name, fields: fields.map((attribute) => ({ attribute })) }];
      }),
      removeIndex: jest.fn(async (_table, name) => { indexes = indexes.filter((index) => index.name !== name); }),
    };

    await notificationFeedIndexMigration.up(queryInterface);
    expect(queryInterface.addIndex).toHaveBeenCalledWith("notifications", ["user_id", "created_at"], { name: "idx_notifications_user_created" });
    expect(indexes.find((index) => index.name === "idx_notifications_user_created").fields.map((field) => field.attribute))
      .toEqual(["user_id", "created_at"]);

    queryInterface.addIndex.mockClear();
    await notificationFeedIndexMigration.up(queryInterface);
    expect(queryInterface.addIndex).not.toHaveBeenCalled();
  });

  test("notification feed index rollback removes only its validated index", async () => {
    let indexes = [
      { name: "idx_notifications_user_read", fields: [{ attribute: "user_id" }, { attribute: "is_read" }] },
      { name: "idx_notifications_user_created", fields: [{ attribute: "user_id" }, { attribute: "created_at" }] },
    ];
    const queryInterface = {
      showIndex: jest.fn(async () => indexes),
      removeIndex: jest.fn(async (_table, name) => { indexes = indexes.filter((index) => index.name !== name); }),
    };

    await notificationFeedIndexMigration.down(queryInterface);
    expect(queryInterface.removeIndex).toHaveBeenCalledWith("notifications", "idx_notifications_user_created");
    expect(indexes.map((index) => index.name)).toEqual(["idx_notifications_user_read"]);
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
      addConstraint: jest.fn(),
      sequelize: { QueryTypes: { SELECT: "SELECT" }, query: jest.fn(async () => []) },
    };
    await inventoryMigration.up(queryInterface, Sequelize);
    expect(queryInterface.addColumn).toHaveBeenCalledWith("inventory_items", "status", expect.objectContaining({ defaultValue: "Available" }));
    expect(queryInterface.addColumn).toHaveBeenCalledWith("inventory_requests", "event_id", expect.objectContaining({ allowNull: true }));
    expect(queryInterface.addColumn).toHaveBeenCalledWith("inventory_requests", "service_id", expect.objectContaining({ allowNull: true }));
    expect(queryInterface.addColumn).toHaveBeenCalledWith("inventory_requests", "ministry_role_id", expect.objectContaining({ allowNull: true }));
    expect(queryInterface.addConstraint).toHaveBeenCalledTimes(3);

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

  test("expands inventory availability states and backfills quantity-derived states", async () => {
    const query = jest.fn().mockResolvedValue([]);
    const queryInterface = {
      describeTable: jest.fn(async () => ({ status: {}, quantity: {}, low_stock_threshold: {} })),
      changeColumn: jest.fn(),
      sequelize: { query },
    };
    await inventoryAvailabilityMigration.up(queryInterface, Sequelize);
    expect(queryInterface.changeColumn).toHaveBeenCalledWith("inventory_items", "status", expect.objectContaining({
      type: Sequelize.ENUM("Available", "Low Stock", "Out of Stock", "Under Repair"),
      allowNull: false,
    }));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("WHEN quantity <= 0 THEN 'Out of Stock'"));
  });

  test("adds refresh rotation timestamps and a prefix index for token hashes", async () => {
    const query = jest.fn(async (sql) => sql === "SHOW INDEX FROM refresh_tokens" ? [[], {}] : [[], {}]);
    const queryInterface = {
      describeTable: jest.fn(async () => ({ revoked: {}, token: {} })),
      addColumn: jest.fn(),
      removeColumn: jest.fn(),
      removeIndex: jest.fn(),
      sequelize: { query },
    };

    await refreshTokenRotationMigration.up(queryInterface, Sequelize);
    expect(queryInterface.addColumn).toHaveBeenCalledWith("refresh_tokens", "revoked_at", expect.objectContaining({ allowNull: true }));
    expect(query).toHaveBeenCalledWith(expect.stringContaining("ADD INDEX idx_refresh_tokens_token_hash (token(64))"));
  });

  test("grants the Finance Team the read/create/update access used by its UI", async () => {
    const query = jest.fn(async (sql) => {
      if (sql.includes("FROM roles WHERE role_name")) return [{ id: 4 }];
      if (sql.includes("FROM permissions WHERE module")) {
        return [
          { id: 10, action: "read" },
          { id: 11, action: "create" },
          { id: 12, action: "update" },
        ];
      }
      return [];
    });
    const queryInterface = {
      sequelize: { QueryTypes: { SELECT: "SELECT" }, query },
    };

    await financeTeamAccessMigration.up(queryInterface);

    const grants = query.mock.calls.filter(([sql]) => sql.includes("INSERT IGNORE INTO role_permissions"));
    expect(grants).toHaveLength(3);
    expect(grants.map(([, options]) => options.replacements)).toEqual([
      [4, 10],
      [4, 11],
      [4, 12],
    ]);
    await expect(financeTeamAccessMigration.down()).rejects.toThrow(/required by the system/);
  });

  test("seeds the income categories required by the giving form without duplicating names", async () => {
    const query = jest.fn();
    await financialCategoriesMigration.up({ sequelize: { query } });

    expect(query).toHaveBeenCalledTimes(8);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT IGNORE INTO financial_categories"),
      { replacements: ["Tithes", "Regular tithe contributions from members"] },
    );
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("INSERT IGNORE INTO financial_categories"),
      { replacements: ["Offering", "General love offerings during services"] },
    );
    await expect(financialCategoriesMigration.down()).rejects.toThrow(/required by the Finance module/);
  });

  test("verifies anonymous financial records can omit member_id on TiDB", async () => {
    const query = jest.fn(async (sql) => {
      if (sql.startsWith("SHOW COLUMNS")) return [[{ Field: "member_id", Null: "YES" }], {}];
      return [[], {}];
    });
    const queryInterface = {
      describeTable: jest.fn(async () => ({ member_id: { allowNull: false } })),
      sequelize: { query },
    };

    await anonymousMemberNullabilityMigration.up(queryInterface);

    expect(query).toHaveBeenCalledWith(
      "ALTER TABLE `financial_records` MODIFY COLUMN `member_id` INT UNSIGNED NULL",
    );
    expect(query).toHaveBeenCalledWith(
      "SHOW COLUMNS FROM financial_records WHERE Field = 'member_id'",
    );
  });

  test("adds optional review notes to inventory requests when the column is missing", async () => {
    const queryInterface = {
      describeTable: jest.fn().mockResolvedValue({ id: {}, status: {} }),
      addColumn: jest.fn(),
      removeColumn: jest.fn(),
    };

    await inventoryRequestReviewNoteMigration.up(queryInterface, Sequelize);

    expect(queryInterface.addColumn).toHaveBeenCalledWith(
      "inventory_requests",
      "review_note",
      expect.objectContaining({ type: Sequelize.TEXT, allowNull: true }),
    );

    const existingColumnInterface = {
      describeTable: jest.fn().mockResolvedValue({ id: {}, review_note: {} }),
      addColumn: jest.fn(),
    };
    await inventoryRequestReviewNoteMigration.up(existingColumnInterface, Sequelize);
    expect(existingColumnInterface.addColumn).not.toHaveBeenCalled();
  });

  test("grants Finance Team archive read/create and seeds only missing baseline categories", async () => {
    const query = jest.fn(async (sql) => {
      if (sql.includes("SELECT id FROM roles")) return [{ id: 7 }];
      if (sql.includes("SELECT id, action FROM permissions")) return [
        { id: 12, action: "read" },
        { id: 13, action: "create" },
      ];
      if (sql.includes("SELECT name FROM archive_categories")) return [{ name: "Media" }];
      return [];
    });
    const queryInterface = {
      sequelize: { query, QueryTypes: Sequelize.QueryTypes },
      bulkInsert: jest.fn(),
    };

    await financeArchiveAccessMigration.up(queryInterface);

    const grants = query.mock.calls.filter(([sql]) => sql.includes("INSERT IGNORE INTO role_permissions"));
    expect(grants.map(([, options]) => options.replacements)).toEqual([[7, 12], [7, 13]]);
    expect(queryInterface.bulkInsert).toHaveBeenCalledWith(
      "archive_categories",
      expect.arrayContaining([expect.objectContaining({ name: "Financial Records" })]),
    );
    const categoryNames = queryInterface.bulkInsert.mock.calls[0][1].map((row) => row.name);
    expect(categoryNames).not.toContain("Media");
    await expect(financeArchiveAccessMigration.down()).rejects.toThrow(/required by the system/);
  });

  test("fails rather than silently omitting a required Finance archive action", async () => {
    const queryInterface = {
      sequelize: {
        QueryTypes: Sequelize.QueryTypes,
        query: jest.fn(async (sql) => (
          sql.includes("SELECT id FROM roles") ? [{ id: 7 }] : [{ id: 12, action: "read" }]
        )),
      },
      bulkInsert: jest.fn(),
    };

    await expect(financeArchiveAccessMigration.up(queryInterface))
      .rejects.toThrow(/permissions not found: create/);
    expect(queryInterface.bulkInsert).not.toHaveBeenCalled();
  });

  test("adds a nullable requester-scoped inventory request key and unique index idempotently", async () => {
    let hasRequestKey = false;
    let indexes = [];
    const queryInterface = {
      describeTable: jest.fn(async () => ({ ...(hasRequestKey ? { request_key: { allowNull: true } } : {}) })),
      addColumn: jest.fn(async (_table, _column, definition) => { hasRequestKey = definition.allowNull; }),
      removeColumn: jest.fn(async () => { hasRequestKey = false; }),
      showIndex: jest.fn(async () => indexes),
      addIndex: jest.fn(async (_table, fields, options) => { indexes.push({ name: options.name, fields, unique: options.unique }); }),
      removeIndex: jest.fn(async (_table, name) => { indexes = indexes.filter((index) => index.name !== name); }),
    };

    await inventoryRequestIdempotencyMigration.up(queryInterface, Sequelize);
    expect(queryInterface.addColumn).toHaveBeenCalledWith("inventory_requests", "request_key", expect.objectContaining({ allowNull: true }));
    expect(indexes).toEqual([expect.objectContaining({
      name: "uq_inventory_requests_requester_key",
      fields: ["requested_by", "request_key"],
      unique: true,
    })]);

    await inventoryRequestIdempotencyMigration.up(queryInterface, Sequelize);
    expect(queryInterface.addColumn).toHaveBeenCalledTimes(1);
    expect(queryInterface.addIndex).toHaveBeenCalledTimes(1);

    await inventoryRequestIdempotencyMigration.down(queryInterface);
    expect(queryInterface.removeIndex).toHaveBeenCalledWith("inventory_requests", "uq_inventory_requests_requester_key");
    expect(queryInterface.removeColumn).toHaveBeenCalledWith("inventory_requests", "request_key");
  });

  test("restores the archive read/create/update grants used by Pastor, Registration, and Ministry roles", async () => {
    const query = jest.fn(async (sql) => {
      if (sql.includes("FROM roles")) return [
        { id: 1, role_name: "Pastor" },
        { id: 2, role_name: "Registration Team" },
        { id: 3, role_name: "Ministry Leader" },
      ];
      if (sql.includes("FROM permissions")) return [
        { id: 10, action: "read" },
        { id: 11, action: "create" },
        { id: 12, action: "update" },
      ];
      return [];
    });
    const queryInterface = { sequelize: { query, QueryTypes: Sequelize.QueryTypes } };

    await archiveRoleAccessMigration.up(queryInterface);

    const grants = query.mock.calls
      .filter(([sql]) => sql.includes("INSERT IGNORE INTO role_permissions"))
      .map(([, options]) => options.replacements);
    expect(grants).toEqual([
      [1, 10], [1, 12],
      [2, 10], [2, 11],
      [3, 10], [3, 11], [3, 12],
    ]);
    await expect(archiveRoleAccessMigration.down()).rejects.toThrow(/required by the system/);
  });

  test("skips the obsolete Ministry Leader grant when that global role is absent", async () => {
    const query = jest.fn(async (sql) => {
      if (sql.includes("FROM roles")) return [
        { id: 1, role_name: "Pastor" },
        { id: 2, role_name: "Registration Team" },
      ];
      if (sql.includes("FROM permissions")) return [
        { id: 10, action: "read" },
        { id: 11, action: "create" },
        { id: 12, action: "update" },
      ];
      return [];
    });
    const queryInterface = { sequelize: { query, QueryTypes: Sequelize.QueryTypes } };

    await archiveRoleAccessMigration.up(queryInterface);

    const grants = query.mock.calls
      .filter(([sql]) => sql.includes("INSERT IGNORE INTO role_permissions"))
      .map(([, options]) => options.replacements);
    expect(grants).toEqual([[1, 10], [1, 12], [2, 10], [2, 11]]);
  });
});
