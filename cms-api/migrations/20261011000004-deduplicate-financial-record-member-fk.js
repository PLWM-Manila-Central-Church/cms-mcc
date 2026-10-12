"use strict";

const TABLE = "financial_records";
const CANONICAL_CONSTRAINT = "fk_financial_records_member_id";
const MEMBER_REFERENCE_QUERY = `
  SELECT CONSTRAINT_NAME AS constraint_name,
         REFERENCED_TABLE_NAME AS referenced_table_name,
         REFERENCED_COLUMN_NAME AS referenced_column_name
  FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'financial_records'
    AND COLUMN_NAME = 'member_id'
    AND REFERENCED_TABLE_NAME = 'members'
    AND REFERENCED_COLUMN_NAME = 'id'
  ORDER BY CONSTRAINT_NAME
`;

const getMemberForeignKeys = (queryInterface) => queryInterface.sequelize.query(
  MEMBER_REFERENCE_QUERY,
  { type: queryInterface.sequelize.QueryTypes.SELECT },
);

const safeConstraintName = (constraintName) => {
  if (!/^[A-Za-z0-9_]+$/.test(constraintName || "")) {
    throw new Error("Unexpected financial_records.member_id constraint name; refusing unsafe DDL.");
  }
  return `\`${constraintName}\``;
};

module.exports = {
  async up(queryInterface) {
    const columns = await queryInterface.describeTable(TABLE);
    if (!columns.member_id) {
      throw new Error("financial_records.member_id is required for its Members foreign key.");
    }

    let memberForeignKeys = await getMemberForeignKeys(queryInterface);
    if (memberForeignKeys.length === 0) {
      const orphanRows = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS count
         FROM financial_records AS records
         LEFT JOIN members ON members.id = records.member_id
         WHERE records.member_id IS NOT NULL AND members.id IS NULL`,
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      if (Number(orphanRows[0]?.count || 0) > 0) {
        throw new Error("Cannot restore the financial member foreign key while orphaned member_id values exist.");
      }

      await queryInterface.addConstraint(TABLE, {
        fields: ["member_id"],
        type: "foreign key",
        name: CANONICAL_CONSTRAINT,
        references: { table: "members", field: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      });
      memberForeignKeys = await getMemberForeignKeys(queryInterface);
    }

    const keep = memberForeignKeys.find(({ constraint_name: name }) => name === CANONICAL_CONSTRAINT)
      || memberForeignKeys.find(({ constraint_name: name }) => name === "fk_1")
      || memberForeignKeys[0];
    if (!keep?.constraint_name) {
      throw new Error("Could not identify a valid financial_records.member_id foreign key.");
    }

    for (const { constraint_name: name } of memberForeignKeys) {
      if (name === keep.constraint_name) continue;
      await queryInterface.sequelize.query(
        `ALTER TABLE \`${TABLE}\` DROP FOREIGN KEY ${safeConstraintName(name)}`,
      );
    }

    const remaining = await getMemberForeignKeys(queryInterface);
    if (remaining.length !== 1 || remaining[0].referenced_table_name !== "members" || remaining[0].referenced_column_name !== "id") {
      throw new Error("financial_records.member_id must have exactly one foreign key to members.id after normalization.");
    }
  },

  async down() {
    throw new Error("This migration removes a redundant foreign key and is intentionally irreversible.");
  },
};
