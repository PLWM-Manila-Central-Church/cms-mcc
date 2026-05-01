"use strict";

const exists = async (queryInterface, sql, replacements) => {
  const [rows] = await queryInterface.sequelize.query(sql, { replacements });
  return Number(rows[0]?.count || 0) > 0;
};

const tableExists = (queryInterface, tableName) =>
  exists(
    queryInterface,
    "SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
    [tableName],
  );

const columnExists = (queryInterface, tableName, columnName) =>
  exists(
    queryInterface,
    "SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [tableName, columnName],
  );

const indexExists = (queryInterface, tableName, indexName) =>
  exists(
    queryInterface,
    "SELECT COUNT(*) AS count FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
    [tableName, indexName],
  );

const addIndexIfMissing = async (queryInterface, tableName, fields, options) => {
  if (!(await indexExists(queryInterface, tableName, options.name))) {
    await queryInterface.addIndex(tableName, fields, options);
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const now = Sequelize.literal("CURRENT_TIMESTAMP");

    if (!(await tableExists(queryInterface, "ministries"))) {
      await queryInterface.createTable("ministries", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        legacy_ministry_role_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: "ministry_roles", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        name: { type: Sequelize.STRING(100), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        is_active: {
          type: Sequelize.TINYINT,
          allowNull: false,
          defaultValue: 1,
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      });
    }

    await addIndexIfMissing(queryInterface, "ministries", ["name"], {
      name: "uq_ministries_name",
      unique: true,
    });
    await addIndexIfMissing(queryInterface, "ministries", ["legacy_ministry_role_id"], {
      name: "uq_ministries_legacy_ministry_role",
      unique: true,
    });

    if (!(await tableExists(queryInterface, "ministry_positions"))) {
      await queryInterface.createTable("ministry_positions", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        ministry_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: "ministries", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        name: { type: Sequelize.STRING(100), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        is_active: {
          type: Sequelize.TINYINT,
          allowNull: false,
          defaultValue: 1,
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      });
    }

    await addIndexIfMissing(queryInterface, "ministry_positions", ["ministry_id", "name"], {
      name: "uq_ministry_positions_ministry_name",
      unique: true,
    });

    if (!(await tableExists(queryInterface, "user_leader_assignments"))) {
      await queryInterface.createTable("user_leader_assignments", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        user_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        scope_type: {
          type: Sequelize.ENUM("ministry", "cell_group", "member_group"),
          allowNull: false,
        },
        scope_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        legacy_column: { type: Sequelize.STRING(64), allowNull: true },
        assigned_by: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      });
    }

    await addIndexIfMissing(
      queryInterface,
      "user_leader_assignments",
      ["user_id", "scope_type", "scope_id"],
      { name: "uq_user_leader_assignments_user_scope", unique: true },
    );
    await addIndexIfMissing(queryInterface, "user_leader_assignments", ["scope_type", "scope_id"], {
      name: "idx_user_leader_assignments_scope",
    });

    if (!(await tableExists(queryInterface, "inventory_transactions"))) {
      await queryInterface.createTable("inventory_transactions", {
        id: {
          type: Sequelize.INTEGER.UNSIGNED,
          autoIncrement: true,
          primaryKey: true,
        },
        item_id: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          references: { model: "inventory_items", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "CASCADE",
        },
        transaction_type: {
          type: Sequelize.ENUM(
            "initial",
            "adjustment",
            "usage",
            "request_fulfillment",
            "return",
          ),
          allowNull: false,
        },
        quantity_delta: { type: Sequelize.INTEGER, allowNull: false },
        source_type: { type: Sequelize.STRING(80), allowNull: true },
        source_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        recorded_by: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: true,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        occurred_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: now },
      });
    }

    await addIndexIfMissing(queryInterface, "inventory_transactions", ["item_id", "occurred_at"], {
      name: "idx_inventory_transactions_item_date",
    });
    await addIndexIfMissing(queryInterface, "inventory_transactions", ["source_type", "source_id"], {
      name: "idx_inventory_transactions_source",
    });

    if (!(await columnExists(queryInterface, "archive_versions", "file_size"))) {
      await queryInterface.addColumn("archive_versions", "file_size", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    if (!(await columnExists(queryInterface, "archive_records", "current_version_id"))) {
      await queryInterface.addColumn("archive_records", "current_version_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    await addIndexIfMissing(queryInterface, "archive_records", ["current_version_id"], {
      name: "idx_archive_records_current_version",
    });

    await queryInterface.sequelize.query(`
      INSERT INTO ministries (legacy_ministry_role_id, name, is_active, created_at, updated_at)
      SELECT mr.id, mr.name, 1, COALESCE(mr.created_at, CURRENT_TIMESTAMP), COALESCE(mr.updated_at, CURRENT_TIMESTAMP)
      FROM ministry_roles mr
      LEFT JOIN ministries m ON m.legacy_ministry_role_id = mr.id
      WHERE m.id IS NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO user_leader_assignments (user_id, scope_type, scope_id, legacy_column, created_at, updated_at)
      SELECT u.id, 'ministry', u.leads_ministry_id, 'leads_ministry_id', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM users u
      LEFT JOIN user_leader_assignments ula
        ON ula.user_id = u.id
       AND ula.scope_type = 'ministry'
       AND ula.scope_id = u.leads_ministry_id
      WHERE u.leads_ministry_id IS NOT NULL
        AND ula.id IS NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO user_leader_assignments (user_id, scope_type, scope_id, legacy_column, created_at, updated_at)
      SELECT u.id, 'cell_group', u.leads_cell_group_id, 'leads_cell_group_id', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM users u
      LEFT JOIN user_leader_assignments ula
        ON ula.user_id = u.id
       AND ula.scope_type = 'cell_group'
       AND ula.scope_id = u.leads_cell_group_id
      WHERE u.leads_cell_group_id IS NOT NULL
        AND ula.id IS NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO user_leader_assignments (user_id, scope_type, scope_id, legacy_column, created_at, updated_at)
      SELECT u.id, 'member_group', u.leads_group_id, 'leads_group_id', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      FROM users u
      LEFT JOIN user_leader_assignments ula
        ON ula.user_id = u.id
       AND ula.scope_type = 'member_group'
       AND ula.scope_id = u.leads_group_id
      WHERE u.leads_group_id IS NOT NULL
        AND ula.id IS NULL
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO inventory_transactions
        (item_id, transaction_type, quantity_delta, source_type, source_id, notes, recorded_by, occurred_at, created_at, updated_at)
      SELECT
        ii.id,
        'initial',
        ii.quantity,
        'inventory_items',
        ii.id,
        'Backfilled from inventory_items.quantity during 3NF compatibility migration.',
        NULL,
        COALESCE(ii.created_at, CURRENT_TIMESTAMP),
        CURRENT_TIMESTAMP,
        CURRENT_TIMESTAMP
      FROM inventory_items ii
      LEFT JOIN inventory_transactions it
        ON it.item_id = ii.id
       AND it.transaction_type = 'initial'
       AND it.source_type = 'inventory_items'
       AND it.source_id = ii.id
      WHERE it.id IS NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE archive_versions av
      JOIN archive_records ar ON ar.id = av.record_id
      SET av.file_size = ar.file_size
      WHERE av.file_size IS NULL
        AND ar.file_size IS NOT NULL
    `);

    await queryInterface.sequelize.query(`
      UPDATE archive_records ar
      JOIN (
        SELECT av.record_id, av.id
        FROM archive_versions av
        JOIN (
          SELECT record_id, MAX(version_number) AS version_number
          FROM archive_versions
          GROUP BY record_id
        ) latest
          ON latest.record_id = av.record_id
         AND latest.version_number = av.version_number
      ) current_versions
        ON current_versions.record_id = ar.id
      SET ar.current_version_id = current_versions.id
      WHERE ar.current_version_id IS NULL
    `);
  },

  async down(queryInterface) {
    if (await columnExists(queryInterface, "archive_records", "current_version_id")) {
      await queryInterface.removeColumn("archive_records", "current_version_id");
    }

    if (await columnExists(queryInterface, "archive_versions", "file_size")) {
      await queryInterface.removeColumn("archive_versions", "file_size");
    }

    if (await tableExists(queryInterface, "inventory_transactions")) {
      await queryInterface.dropTable("inventory_transactions");
    }

    if (await tableExists(queryInterface, "user_leader_assignments")) {
      await queryInterface.dropTable("user_leader_assignments");
    }

    if (await tableExists(queryInterface, "ministry_positions")) {
      await queryInterface.dropTable("ministry_positions");
    }

    if (await tableExists(queryInterface, "ministries")) {
      await queryInterface.dropTable("ministries");
    }
  },
};
