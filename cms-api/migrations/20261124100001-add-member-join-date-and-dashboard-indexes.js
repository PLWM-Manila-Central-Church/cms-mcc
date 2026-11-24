"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const membersCols = await queryInterface.describeTable("members");
    if (!membersCols.join_date) {
      await queryInterface.addColumn("members", "join_date", {
        type: Sequelize.DATEONLY,
        allowNull: true,
        after: "spiritual_birthday",
      });
    }
    if (!membersCols.import_batch) {
      await queryInterface.addColumn("members", "import_batch", {
        type: Sequelize.STRING(64),
        allowNull: true,
        after: "join_date",
      });
    }

    const memberIndexes = await queryInterface.showIndex("members");
    if (!memberIndexes.some((idx) => idx.name === "idx_members_join_date")) {
      await queryInterface.addIndex("members", ["join_date"], {
        name: "idx_members_join_date",
      });
    }
  },

  async down(queryInterface) {
    const memberIndexes = await queryInterface.showIndex("members");
    if (memberIndexes.some((idx) => idx.name === "idx_members_join_date")) {
      await queryInterface.removeIndex("members", "idx_members_join_date");
    }
    const membersCols = await queryInterface.describeTable("members");
    if (membersCols.import_batch) {
      await queryInterface.removeColumn("members", "import_batch");
    }
    if (membersCols.join_date) {
      await queryInterface.removeColumn("members", "join_date");
    }
  },
};
