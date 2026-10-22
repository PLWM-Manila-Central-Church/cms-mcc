"use strict";

const retainedTables = [
  "notifications",
  "emergency_contacts",
  "ministry_assignments",
  "ministry_memberships",
  "attendance_batch_items",
];

const archiveColumns = {
  is_deleted: { allowNull: false, defaultValue: 0 },
  deleted_at: { allowNull: true },
  deleted_by: { allowNull: true },
};

const normalizeIdentifier = (value) => String(value || "").replace(/[`"']/g, "").toLowerCase();

const getColumn = async (queryInterface, tableName, columnName) => {
  const columns = await queryInterface.describeTable(tableName);
  const key = Object.keys(columns).find((name) => normalizeIdentifier(name) === normalizeIdentifier(columnName));
  return key ? { name: key, definition: columns[key] } : null;
};

const ensureColumn = async (queryInterface, tableName, columnName, definition) => {
  const existing = await getColumn(queryInterface, tableName, columnName);
  if (!existing) {
    await queryInterface.addColumn(tableName, columnName, definition);
    return;
  }

  const needsNullabilityChange = definition.allowNull !== undefined
    && Boolean(existing.definition.allowNull) !== Boolean(definition.allowNull);
  const needsDefaultChange = Object.hasOwn(definition, "defaultValue")
    && existing.definition.defaultValue !== definition.defaultValue;
  if (needsNullabilityChange || needsDefaultChange) {
    await queryInterface.changeColumn(tableName, columnName, definition);
  }
};

const ensureIndex = async (queryInterface, tableName, indexDefinition) => {
  const indexes = await queryInterface.showIndex(tableName);
  const name = normalizeIdentifier(indexDefinition.name);
  const expectedFields = indexDefinition.fields.map(normalizeIdentifier);
  const exists = indexes.some((index) => {
    if (normalizeIdentifier(index.name) === name) return true;
    const fields = (index.fields || []).map((field) => normalizeIdentifier(
      typeof field === "string" ? field : field.attribute || field.name,
    ));
    return Boolean(index.unique) === Boolean(indexDefinition.unique)
      && fields.length === expectedFields.length
      && fields.every((field, position) => field === expectedFields[position]);
  });
  if (!exists) await queryInterface.addIndex(tableName, indexDefinition);
};

const tableExists = async (queryInterface, tableName) => {
  const tables = await queryInterface.showAllTables();
  return tables.some((table) => {
    const name = typeof table === "string" ? table : Object.values(table || {})[0];
    return normalizeIdentifier(name) === normalizeIdentifier(tableName);
  });
};

const ensureEventImageArchiveTable = async (queryInterface, Sequelize) => {
  const tableName = "event_image_archives";
  if (!(await tableExists(queryInterface, tableName))) {
    // Keep this DDL independent from a foreign-key constraint: TiDB can apply
    // online schema changes in stages, so columns and lookup indexes must be
    // present before relationship checks are introduced at the service layer.
    await queryInterface.createTable(tableName, {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      image_key: { type: Sequelize.STRING(500), allowNull: true },
      image_url: { type: Sequelize.STRING(1000), allowNull: false },
      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  }

  const columns = await queryInterface.describeTable(tableName);
  const requiredColumns = ["id", "event_id", "image_key", "image_url", "created_by", "is_deleted", "deleted_at", "deleted_by", "created_at", "updated_at"];
  const missingColumns = requiredColumns.filter((column) => !Object.keys(columns).some((name) => normalizeIdentifier(name) === column));
  if (missingColumns.length) {
    throw new Error(`The existing ${tableName} table is incomplete; missing columns: ${missingColumns.join(", ")}`);
  }

  await ensureIndex(queryInterface, tableName, {
    fields: ["event_id", "is_deleted", "deleted_at"],
    name: "idx_event_image_archives_state",
  });
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const tableName of retainedTables) {
      for (const [columnName, definition] of Object.entries(archiveColumns)) {
        const columnDefinition = {
          ...definition,
          type: columnName === "is_deleted" ? Sequelize.TINYINT
            : columnName === "deleted_at" ? Sequelize.DATE : Sequelize.INTEGER.UNSIGNED,
        };
        await ensureColumn(queryInterface, tableName, columnName, columnDefinition);
      }
      await ensureIndex(queryInterface, tableName, {
        fields: ["is_deleted", "deleted_at"],
        name: `idx_${tableName}_archive_state`,
      });
    }

    await ensureColumn(queryInterface, "services", "service_time", {
      type: Sequelize.TIME,
      allowNull: true,
    });
    await ensureColumn(queryInterface, "services", "capacity", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await ensureColumn(queryInterface, "services", "total_parking_slots", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await ensureColumn(queryInterface, "events", "total_parking_slots", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      defaultValue: null,
    });

    // Create event_id as a standalone column before indexing it. The original
    // inline REFERENCES definition failed during production TiDB DDL with
    // "Key column 'event_id' doesn't exist in table". Service code validates
    // the referenced event, while this unique index enforces one service per
    // event and supports the association lookup.
    await ensureColumn(queryInterface, "services", "event_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await ensureIndex(queryInterface, "services", {
      fields: ["event_id"],
      unique: true,
      name: "uq_services_linked_event",
    });

    await ensureEventImageArchiveTable(queryInterface, Sequelize);
  },

  // Forward-only after an event-linked service can have an unknown time or
  // capacity. Restoring NOT NULL would require inventing schedule data.
  down: async () => {
    throw new Error("Workflow retention and calendar-linked service fields are forward-only; preserve the recorded archive state and unknown schedule values.");
  },
};
