"use strict";

const tables = ["funds", "accounts", "expense_categories", "expenses"];

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

module.exports = {
  up: async (queryInterface, Sequelize) => {
    for (const table of tables) {
      await ensureColumn(queryInterface, table, "is_deleted", {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
      });
      await ensureColumn(queryInterface, table, "deleted_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
      // Keep the archiver ID as nullable audit metadata. TiDB failed when this
      // column and its user foreign key were added in one ALTER TABLE; the
      // authenticated API already supplies a valid user ID.
      await ensureColumn(queryInterface, table, "deleted_by", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
      await ensureIndex(queryInterface, table, {
        fields: ["is_deleted", "deleted_at"],
        name: `idx_${table}_archive_state`,
      });
    }
  },

  down: async () => {
    throw new Error("Finance archive state is forward-only; keep archived transaction history and restore it through System Archives.");
  },
};
