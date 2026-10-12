"use strict";

const TABLE = "financial_records";
const MEMBER_GIVING_INDEX = {
  name: "idx_financial_records_member_deleted_date",
  fields: ["member_id", "is_deleted", "transaction_date"],
};
const REDUNDANT_PREFIX_INDEX = {
  name: "idx_financial_records_member_deleted",
  fields: ["member_id", "is_deleted"],
};

const indexFields = (index) => (index.fields || []).map((field) =>
  field.attribute || field.field || field.name || String(field),
);

const assertIndexMatches = (index, definition) => {
  if (!index || JSON.stringify(indexFields(index)) !== JSON.stringify(definition.fields)) {
    throw new Error(`${TABLE}.${definition.name} has an unexpected definition; refusing index migration.`);
  }
};

const findIndex = (indexes, name) => indexes.find((index) => index.name === name);

module.exports = {
  async up(queryInterface) {
    const columns = await queryInterface.describeTable(TABLE);
    for (const column of MEMBER_GIVING_INDEX.fields) {
      if (!columns[column]) throw new Error(`${TABLE}.${column} is required for the Member giving index.`);
    }

    let indexes = await queryInterface.showIndex(TABLE);
    const existingMemberGivingIndex = findIndex(indexes, MEMBER_GIVING_INDEX.name);
    if (existingMemberGivingIndex) {
      assertIndexMatches(existingMemberGivingIndex, MEMBER_GIVING_INDEX);
    } else {
      await queryInterface.addIndex(TABLE, MEMBER_GIVING_INDEX.fields, { name: MEMBER_GIVING_INDEX.name });
      indexes = await queryInterface.showIndex(TABLE);
      assertIndexMatches(findIndex(indexes, MEMBER_GIVING_INDEX.name), MEMBER_GIVING_INDEX);
    }

    const redundantPrefixIndex = findIndex(indexes, REDUNDANT_PREFIX_INDEX.name);
    if (redundantPrefixIndex) {
      assertIndexMatches(redundantPrefixIndex, REDUNDANT_PREFIX_INDEX);
      await queryInterface.removeIndex(TABLE, REDUNDANT_PREFIX_INDEX.name);
    }

    indexes = await queryInterface.showIndex(TABLE);
    assertIndexMatches(findIndex(indexes, MEMBER_GIVING_INDEX.name), MEMBER_GIVING_INDEX);
    if (findIndex(indexes, REDUNDANT_PREFIX_INDEX.name)) {
      throw new Error(`${TABLE}.${REDUNDANT_PREFIX_INDEX.name} remains redundant after migration.`);
    }
  },

  async down(queryInterface) {
    const columns = await queryInterface.describeTable(TABLE);
    for (const column of REDUNDANT_PREFIX_INDEX.fields) {
      if (!columns[column]) throw new Error(`${TABLE}.${column} is required to restore the prior index.`);
    }

    let indexes = await queryInterface.showIndex(TABLE);
    const memberGivingIndex = findIndex(indexes, MEMBER_GIVING_INDEX.name);
    if (memberGivingIndex) assertIndexMatches(memberGivingIndex, MEMBER_GIVING_INDEX);
    const existingPrefixIndex = findIndex(indexes, REDUNDANT_PREFIX_INDEX.name);
    if (existingPrefixIndex) {
      assertIndexMatches(existingPrefixIndex, REDUNDANT_PREFIX_INDEX);
    } else {
      // Restore the old prefix before dropping the new index so rollback never
      // leaves the Member giving query without either access path.
      await queryInterface.addIndex(TABLE, REDUNDANT_PREFIX_INDEX.fields, { name: REDUNDANT_PREFIX_INDEX.name });
    }

    indexes = await queryInterface.showIndex(TABLE);
    assertIndexMatches(findIndex(indexes, REDUNDANT_PREFIX_INDEX.name), REDUNDANT_PREFIX_INDEX);
    if (findIndex(indexes, MEMBER_GIVING_INDEX.name)) {
      await queryInterface.removeIndex(TABLE, MEMBER_GIVING_INDEX.name);
    }

    indexes = await queryInterface.showIndex(TABLE);
    assertIndexMatches(findIndex(indexes, REDUNDANT_PREFIX_INDEX.name), REDUNDANT_PREFIX_INDEX);
    if (findIndex(indexes, MEMBER_GIVING_INDEX.name)) {
      throw new Error(`${TABLE}.${MEMBER_GIVING_INDEX.name} remains after rollback.`);
    }
  },
};
