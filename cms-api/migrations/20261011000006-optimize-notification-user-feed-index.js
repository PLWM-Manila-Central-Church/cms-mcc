"use strict";

const TABLE = "notifications";
const INDEX = {
  name: "idx_notifications_user_created",
  fields: ["user_id", "created_at"],
};

const findIndex = (indexes) => indexes.find((index) => index.name === INDEX.name);
const fieldsOf = (index) => (index?.fields || []).map((field) =>
  field.attribute || field.field || field.name || String(field),
);

const assertIndex = (index) => {
  if (!index || JSON.stringify(fieldsOf(index)) !== JSON.stringify(INDEX.fields)) {
    throw new Error(`${TABLE}.${INDEX.name} has an unexpected definition.`);
  }
};

module.exports = {
  async up(queryInterface) {
    const columns = await queryInterface.describeTable(TABLE);
    for (const column of INDEX.fields) {
      if (!columns[column]) throw new Error(`${TABLE}.${column} is required for the notification feed index.`);
    }

    let indexes = await queryInterface.showIndex(TABLE);
    const existing = findIndex(indexes);
    if (existing) {
      assertIndex(existing);
      return;
    }

    await queryInterface.addIndex(TABLE, INDEX.fields, { name: INDEX.name });
    indexes = await queryInterface.showIndex(TABLE);
    assertIndex(findIndex(indexes));
  },

  async down(queryInterface) {
    const indexes = await queryInterface.showIndex(TABLE);
    const existing = findIndex(indexes);
    if (!existing) return;
    assertIndex(existing);
    await queryInterface.removeIndex(TABLE, INDEX.name);
    if (findIndex(await queryInterface.showIndex(TABLE))) {
      throw new Error(`${TABLE}.${INDEX.name} remains after rollback.`);
    }
  },
};
