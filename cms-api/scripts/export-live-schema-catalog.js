"use strict";

require("dotenv").config();

const fs = require("node:fs");
const path = require("node:path");
const { QueryTypes } = require("sequelize");
const sequelize = require("../src/config/db");
const { assertSafeQrTestTarget } = require("./qr-test-target");

const databaseName = "qr_attendance_qa";
const repositoryRoot = path.resolve(__dirname, "..", "..");
const outputPath = path.join(repositoryRoot, "docs", "TIDB_LIVE_SCHEMA_CATALOG.md");
const exactCounts = process.argv.includes("--exact-counts");
const shouldCheck = process.argv.includes("--check");

const query = (sql, replacements) => sequelize.query(sql, {
  replacements,
  type: QueryTypes.SELECT,
});

const escapeCell = (value) => String(value ?? "—").replaceAll("|", "\\|").replaceAll("\n", " ");
const quoteIdentifier = (value) => `\`${String(value).replaceAll("`", "``")}\``;

const assertCatalogTarget = () => {
  assertSafeQrTestTarget(process.env);
  if (process.env.DB_NAME !== databaseName) {
    throw new Error(`Refusing live catalog generation outside ${databaseName}.`);
  }
  if (!exactCounts) {
    throw new Error("Pass --exact-counts to confirm aggregate-only row counting on the isolated QA schema.");
  }
}

const loadModelsByTable = () => {
  const modelModules = [
    require("../src/models"),
    require("../src/modules/qr-attendance/models"),
  ];
  const tables = new Map();

  for (const modelModule of modelModules) {
    for (const model of Object.values(modelModule)) {
      if (!model?.rawAttributes || typeof model.getTableName !== "function") continue;
      const table = model.getTableName();
      const tableName = typeof table === "string" ? table : table?.tableName;
      if (typeof tableName !== "string") continue;
      tables.set(tableName, model);
    }
  }
  return tables;
};

const modelTypeSignature = (attribute) => {
  const type = attribute.type;
  const key = String(type?.key || type?.constructor?.key || type?.constructor?.name || "").toUpperCase();
  const baseByKey = {
    STRING: "varchar",
    CHAR: "char",
    INTEGER: "int",
    BIGINT: "bigint",
    SMALLINT: "smallint",
    TINYINT: "tinyint",
    BOOLEAN: "tinyint",
    DATE: "datetime",
    DATEONLY: "date",
    TEXT: "text",
    ENUM: "enum",
    DECIMAL: "decimal",
    FLOAT: "float",
    DOUBLE: "double",
    JSON: "json",
  };
  const base = baseByKey[key];
  if (!base) return null;
  const options = type.options || {};
  const signature = { base, unsigned: Boolean(options.unsigned) };
  if (key === "STRING" || key === "CHAR") signature.length = options.length || type._length || 255;
  if (key === "ENUM") signature.values = type.values || options.values || [];
  return signature;
};

const liveTypeSignature = (columnType) => {
  const raw = String(columnType || "").trim();
  const normalized = raw.toLowerCase();
  const match = normalized.match(/^([a-z]+)/);
  if (!match) return null;
  const base = match[1];
  const signature = { base, unsigned: /\bunsigned\b/.test(normalized) };
  const length = normalized.match(/^[a-z]+\((\d+)/);
  if (length) signature.length = Number(length[1]);
  if (base === "enum") {
    signature.values = [...raw.matchAll(/'((?:''|[^'])*)'/g)]
      .map((entry) => entry[1].replaceAll("''", "'"));
  }
  return signature;
};

const findModelTypeDifferences = (modelsByTable, liveColumnsByTable) => {
  const differences = [];
  for (const [tableName, model] of modelsByTable.entries()) {
    const liveColumns = liveColumnsByTable.get(tableName);
    if (!liveColumns) continue;
    for (const [attributeName, attribute] of Object.entries(model.rawAttributes)) {
      const columnName = attribute.field || attribute.fieldName || attributeName;
      const liveColumn = liveColumns.get(columnName);
      if (!liveColumn) continue;
      const modelSignature = modelTypeSignature(attribute);
      const liveSignature = liveTypeSignature(liveColumn.COLUMN_TYPE);
      if (!modelSignature || !liveSignature) continue;

      let compatible = modelSignature.base === liveSignature.base
        && modelSignature.unsigned === liveSignature.unsigned;
      if (compatible && modelSignature.length !== undefined) {
        compatible = modelSignature.length === liveSignature.length;
      }
      if (compatible && modelSignature.values !== undefined) {
        compatible = modelSignature.values.join("\u0000") === (liveSignature.values || []).join("\u0000");
      }
      if (!compatible) {
        differences.push({
          tableName,
          columnName,
          modelType: modelSignature,
          liveType: liveColumn.COLUMN_TYPE,
        });
      }
    }
  }
  return differences;
};

const exactTableCounts = async (tables) => {
  const counts = new Map();
  for (const table of tables) {
    const rows = await query(`SELECT COUNT(*) AS exact_count FROM ${quoteIdentifier(table.TABLE_NAME)}`);
    counts.set(table.TABLE_NAME, Number(rows[0]?.exact_count || 0));
  }
  return counts;
};

const buildCatalog = async () => {
  const [databaseInfo] = await query("SELECT DATABASE() AS schema_name, VERSION() AS server_version");
  if (databaseInfo?.schema_name !== databaseName) {
    throw new Error("Connected schema does not match the isolated QA target.");
  }

  const tables = await query(`
    SELECT TABLE_NAME, ENGINE
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'
    ORDER BY TABLE_NAME
  `);
  const columns = await query(`
    SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT,
           COLUMN_KEY, EXTRA, ORDINAL_POSITION
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME, ORDINAL_POSITION
  `);
  const indexes = await query(`
    SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE, SEQ_IN_INDEX, COLUMN_NAME, SUB_PART, INDEX_TYPE
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE()
    ORDER BY TABLE_NAME, INDEX_NAME, SEQ_IN_INDEX
  `);
  const foreignKeys = await query(`
    SELECT k.TABLE_NAME, k.CONSTRAINT_NAME, k.COLUMN_NAME, k.REFERENCED_TABLE_NAME,
           k.REFERENCED_COLUMN_NAME, k.ORDINAL_POSITION, r.DELETE_RULE, r.UPDATE_RULE
    FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE k
    LEFT JOIN INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.CONSTRAINT_SCHEMA
      AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
      AND r.TABLE_NAME = k.TABLE_NAME
    WHERE k.CONSTRAINT_SCHEMA = DATABASE() AND k.REFERENCED_TABLE_NAME IS NOT NULL
    ORDER BY k.TABLE_NAME, k.CONSTRAINT_NAME, k.ORDINAL_POSITION
  `);
  const counts = await exactTableCounts(tables);
  const modelsByTable = loadModelsByTable();
  const liveTableNames = new Set(tables.map((table) => table.TABLE_NAME));
  const liveColumnsByTable = new Map();
  for (const column of columns) {
    if (!liveColumnsByTable.has(column.TABLE_NAME)) liveColumnsByTable.set(column.TABLE_NAME, new Map());
    liveColumnsByTable.get(column.TABLE_NAME).set(column.COLUMN_NAME, column);
  }

  const modelOnlyTables = [...modelsByTable.keys()].filter((table) => !liveTableNames.has(table)).sort();
  const liveOnlyTables = [...liveTableNames].filter((table) => table !== "SequelizeMeta" && !modelsByTable.has(table)).sort();
  const columnDifferences = [];
  for (const [tableName, model] of modelsByTable.entries()) {
    const liveColumns = liveColumnsByTable.get(tableName);
    if (!liveColumns) continue;
    const modelColumnSet = new Set(Object.entries(model.rawAttributes).map(([attributeName, attribute]) =>
      attribute.field || attribute.fieldName || attributeName));
    const modelOnly = [...modelColumnSet].filter((column) => !liveColumns.has(column)).sort();
    const liveOnly = [...liveColumns.keys()].filter((column) => !modelColumnSet.has(column)).sort();
    if (modelOnly.length || liveOnly.length) columnDifferences.push({ tableName, modelOnly, liveOnly });
  }
  const typeDifferences = findModelTypeDifferences(modelsByTable, liveColumnsByTable);

  const indexesByTable = new Map();
  for (const index of indexes) {
    if (!indexesByTable.has(index.TABLE_NAME)) indexesByTable.set(index.TABLE_NAME, new Map());
    const tableIndexes = indexesByTable.get(index.TABLE_NAME);
    if (!tableIndexes.has(index.INDEX_NAME)) tableIndexes.set(index.INDEX_NAME, []);
    tableIndexes.get(index.INDEX_NAME).push(index);
  }
  const foreignKeysByTable = new Map();
  for (const key of foreignKeys) {
    if (!foreignKeysByTable.has(key.TABLE_NAME)) foreignKeysByTable.set(key.TABLE_NAME, new Map());
    const tableKeys = foreignKeysByTable.get(key.TABLE_NAME);
    if (!tableKeys.has(key.CONSTRAINT_NAME)) tableKeys.set(key.CONSTRAINT_NAME, []);
    tableKeys.get(key.CONSTRAINT_NAME).push(key);
  }

  const inventoryRows = tables.map((table) => {
    const tableIndexes = indexesByTable.get(table.TABLE_NAME) || new Map();
    const tableKeys = foreignKeysByTable.get(table.TABLE_NAME) || new Map();
    return `| \`${escapeCell(table.TABLE_NAME)}\` | ${counts.get(table.TABLE_NAME)} | ${liveColumnsByTable.get(table.TABLE_NAME)?.size || 0} | ${tableIndexes.size} | ${tableKeys.size} |`;
  }).join("\n");

  const tableDefinitions = tables.map((table) => {
    const tableColumns = columns.filter((column) => column.TABLE_NAME === table.TABLE_NAME);
    const tableIndexes = indexesByTable.get(table.TABLE_NAME) || new Map();
    const tableKeys = foreignKeysByTable.get(table.TABLE_NAME) || new Map();
    const columnRows = tableColumns.map((column) =>
      `| \`${escapeCell(column.COLUMN_NAME)}\` | \`${escapeCell(column.COLUMN_TYPE)}\` | ${column.IS_NULLABLE} | ${escapeCell(column.COLUMN_DEFAULT)} | ${escapeCell(column.COLUMN_KEY)} | ${escapeCell(column.EXTRA)} |`).join("\n");
    const indexRows = [...tableIndexes.entries()].map(([indexName, parts]) => {
      const fields = parts.map((part) => `${part.COLUMN_NAME || "<expression>"}${part.SUB_PART ? `(${part.SUB_PART})` : ""}`).join(", ");
      return `- ${Number(parts[0]?.NON_UNIQUE) === 0 ? "Unique" : "Non-unique"} \`${escapeCell(indexName)}\` (${escapeCell(fields)}); ${escapeCell(parts[0]?.INDEX_TYPE)}`;
    });
    const keyRows = [...tableKeys.entries()].map(([constraintName, parts]) => {
      const from = parts.map((part) => part.COLUMN_NAME).join(", ");
      const to = parts.map((part) => `${part.REFERENCED_TABLE_NAME}.${part.REFERENCED_COLUMN_NAME}`).join(", ");
      const deleteRule = parts[0]?.DELETE_RULE || "unspecified";
      const updateRule = parts[0]?.UPDATE_RULE || "unspecified";
      return `- \`${escapeCell(constraintName)}\`: (${escapeCell(from)}) → (${escapeCell(to)}); ON DELETE ${escapeCell(deleteRule)}, ON UPDATE ${escapeCell(updateRule)}`;
    });
    return [
      `### \`${escapeCell(table.TABLE_NAME)}\``,
      "",
      `Engine: ${escapeCell(table.ENGINE)}; exact rows: ${counts.get(table.TABLE_NAME)}.`,
      "",
      "| Column | Live SQL type | Nullable | Default | Key | Extra |",
      "| --- | --- | --- | --- | --- | --- |",
      columnRows,
      "",
      "Indexes",
      indexRows.length ? indexRows.join("\n") : "- None",
      "",
      "Foreign keys",
      keyRows.length ? keyRows.join("\n") : "- None",
    ].join("\n");
  }).join("\n\n");

  const differenceRows = columnDifferences.map((difference) =>
    `| \`${escapeCell(difference.tableName)}\` | ${escapeCell(difference.modelOnly.join(", ") || "—")} | ${escapeCell(difference.liveOnly.join(", ") || "—")} |`).join("\n");
  const typeDifferenceRows = typeDifferences.map((difference) =>
    `| \`${escapeCell(difference.tableName)}\` | \`${escapeCell(difference.columnName)}\` | ${escapeCell(JSON.stringify(difference.modelType))} | \`${escapeCell(difference.liveType)}\` |`).join("\n");
  const migrationTable = liveTableNames.has("SequelizeMeta")
    ? counts.get("SequelizeMeta")
    : "SequelizeMeta table not found";

  return [
    "# Live TiDB Schema Catalog",
    "",
    `Snapshot date: ${new Date().toISOString().slice(0, 10)}. Target schema: \`${databaseName}\`; server: \`${escapeCell(databaseInfo.server_version)}\`.`,
    "",
    "> Read-only metadata snapshot of the isolated QA schema. It includes schema names, column/index/foreign-key definitions, and exact aggregate row counts only; it does not export row-level member, finance, or credential data. TiDB storage-size estimates are omitted because they vary between reads and are not useful capacity evidence at this QA scale.",
    "",
    `- Base tables: ${tables.length} (${modelsByTable.size} Sequelize model tables${liveTableNames.has("SequelizeMeta") ? " plus `SequelizeMeta`" : ""}).`,
    `- Live columns: ${columns.length}. Index definitions: ${indexesByTable.size ? [...indexesByTable.values()].reduce((sum, map) => sum + map.size, 0) : 0}. Physical foreign-key constraints: ${foreignKeysByTable.size ? [...foreignKeysByTable.values()].reduce((sum, map) => sum + map.size, 0) : 0}.`,
    `- Exact aggregate rows: ${[...counts.values()].reduce((sum, count) => sum + count, 0).toLocaleString("en-US")}; applied migrations recorded in SequelizeMeta: ${migrationTable}.`,
    `- Model-only tables: ${modelOnlyTables.length ? modelOnlyTables.map((name) => `\`${escapeCell(name)}\``).join(", ") : "none"}. Live-only tables excluding SequelizeMeta: ${liveOnlyTables.length ? liveOnlyTables.map((name) => `\`${escapeCell(name)}\``).join(", ") : "none"}.`,
    "",
    "## Model/live column differences",
    "",
    columnDifferences.length
      ? ["| Table | Model-only columns | Live-only columns |", "| --- | --- | --- |", differenceRows].join("\n")
      : "No model/live column-name differences were found.",
    "",
    "## Model/live type differences",
    "",
    typeDifferences.length
      ? ["| Table | Column | Model type signature | Live SQL type |", "| --- | --- | --- | --- |", typeDifferenceRows].join("\n")
      : "No type differences were detected for the normalized SQL types supported by this comparison.",
    "",
    "## Table inventory",
    "",
    "| Table | Exact rows | Columns | Indexes | Foreign keys |",
    "| --- | ---: | ---: | ---: | ---: |",
    inventoryRows,
    "",
    "## Live table definitions",
    "",
    tableDefinitions,
    "",
  ].join("\n");
};

const run = async () => {
  assertCatalogTarget();
  await sequelize.authenticate();
  const catalog = await buildCatalog();
  if (shouldCheck) {
    const existing = fs.existsSync(outputPath)
      ? fs.readFileSync(outputPath, "utf8").replace(/\r\n/g, "\n")
      : null;
    if (existing !== catalog) {
      console.error("Live TiDB schema catalog is stale. Run `npm run db:catalog:live -- --exact-counts` against the guarded QA target.");
      process.exitCode = 1;
    } else {
      console.log(`Live schema catalog matches ${databaseName}.`);
    }
    return;
  }
  if (!process.argv.includes("--write")) {
    throw new Error("Pass --write to save this read-only catalog snapshot to docs/TIDB_LIVE_SCHEMA_CATALOG.md.");
  }
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, catalog, "utf8");
  console.log(`Wrote docs/TIDB_LIVE_SCHEMA_CATALOG.md for ${databaseName}; metadata/aggregate row counts only.`);
};

run()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => sequelize.close());
