"use strict";

const fs = require("node:fs");
const path = require("node:path");

const repositoryRoot = path.resolve(__dirname, "..", "..");
const outputPath = path.join(repositoryRoot, "docs", "DATABASE_SCHEMA_CATALOG.md");
const modelModules = [
  require("../src/models"),
  require("../src/modules/qr-attendance/models"),
];

const modelsByTable = new Map();
for (const modelModule of modelModules) {
  for (const model of Object.values(modelModule)) {
    if (!model?.rawAttributes || typeof model.getTableName !== "function") continue;
    const table = model.getTableName();
    const tableName = typeof table === "string" ? table : table?.tableName;
    if (typeof tableName === "string") modelsByTable.set(tableName, model);
  }
}

const escapeCell = (value) => String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const typeName = (attribute) => {
  const dataType = attribute.type;
  if (!dataType) return "unknown";

  const key = dataType.key || dataType.constructor?.key || dataType.constructor?.name || "unknown";
  const options = dataType.options || {};
  if (key === "ENUM") {
    return `ENUM(${(dataType.values || options.values || []).map((value) => JSON.stringify(value)).join(", ")})`;
  }

  const length = options.length || dataType._length;
  const precision = options.precision;
  const scale = options.scale;
  let suffix = "";
  if (key === "STRING" || key === "CHAR") suffix = `(${length || 255})`;
  else if (key === "DECIMAL" && precision !== undefined) {
    suffix = `(${precision}${scale !== undefined ? `, ${scale}` : ""})`;
  }

  return `${key}${suffix}${options.unsigned ? " UNSIGNED" : ""}`;
};

const defaultValue = (value) => {
  if (value === undefined) return "—";
  if (typeof value === "function") return "generated";
  if (value === null) return "null";
  if (typeof value === "object") return escapeCell(value.toString());
  return escapeCell(JSON.stringify(value));
};

const tableSections = [...modelsByTable.entries()]
  .sort(([left], [right]) => left.localeCompare(right))
  .map(([tableName, model]) => {
    const columns = Object.entries(model.rawAttributes).map(([attributeName, attribute]) => {
      const columnName = attribute.field || attribute.fieldName || attributeName;
      const nullable = attribute.primaryKey || attribute.allowNull === false ? "No" : "Yes";
      return `| \`${escapeCell(columnName)}\` | ${escapeCell(typeName(attribute))} | ${nullable} | ${attribute.primaryKey ? "Yes" : "No"} | ${defaultValue(attribute.defaultValue)} |`;
    }).join("\n");

    const indexes = (model.options.indexes || []).map((index) => {
      const fields = (index.fields || []).map((field) => {
        if (typeof field === "string") return field;
        return field.attribute || field.name || JSON.stringify(field);
      });
      return `- ${index.unique ? "Unique" : "Index"} \`${escapeCell(index.name || "unnamed")}\`: ${fields.map(escapeCell).join(", ")}`;
    });

    const relationships = Object.values(model.associations || {}).map((association) => {
      const targetTable = association.target?.getTableName?.();
      const targetName = typeof targetTable === "string" ? targetTable : targetTable?.tableName;
      return `- ${association.associationType} \`${escapeCell(association.as)}\` → \`${escapeCell(targetName || "unknown table")}\` via \`${escapeCell(association.foreignKey || "unspecified key")}\``;
    }).sort();

    return [
      `## \`${escapeCell(tableName)}\``,
      "",
      `Model: \`${escapeCell(model.name)}\``,
      "",
      "| Column | Application type | Nullable | Primary key | Default |",
      "| --- | --- | --- | --- | --- |",
      columns,
      "",
      "Indexes",
      indexes.length ? indexes.join("\n") : "- None declared in the model",
      "",
      "Associations",
      relationships.length ? relationships.join("\n") : "- None declared in the model",
    ].join("\n");
  });

const catalog = [
  "# Application Schema Catalog",
  "",
  "> Generated from the runtime Sequelize models, including the separate QR attendance model module. This describes the application contract, not verified live TiDB DDL. Migrations define the database schema; compare this catalog with the isolated live schema before relying on constraints, indexes, or columns.",
  "",
  `Models: ${modelsByTable.size}`,
  "",
  ...tableSections,
  "",
].join("\n");

if (process.argv.includes("--check")) {
  const existing = fs.existsSync(outputPath)
    ? fs.readFileSync(outputPath, "utf8").replace(/\r\n/g, "\n")
    : null;
  if (existing !== catalog) {
    console.error("Application schema catalog is stale. Run `npm run db:catalog` and include the updated catalog.");
    process.exitCode = 1;
  } else {
    console.log(`Application schema catalog matches ${modelsByTable.size} Sequelize models.`);
  }
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, catalog, "utf8");
  console.log(`Wrote docs/DATABASE_SCHEMA_CATALOG.md for ${modelsByTable.size} Sequelize models.`);
}
