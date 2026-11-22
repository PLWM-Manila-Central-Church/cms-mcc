"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("archive_records", "purge_after", { type: Sequelize.DATE, allowNull: true });
    await queryInterface.addColumn("archive_records", "retention_hold", {
      type: Sequelize.TINYINT, allowNull: false, defaultValue: 0,
    });
    await queryInterface.addColumn("archive_records", "hold_reason", { type: Sequelize.STRING(255), allowNull: true });
    await queryInterface.addIndex("archive_records", ["purge_after"], { name: "idx_archive_purge_after" });

    await queryInterface.sequelize.query(
      "UPDATE archive_records SET purge_after = DATE_ADD(deleted_at, INTERVAL 60 DAY) WHERE is_deleted = 1 AND deleted_at IS NOT NULL AND purge_after IS NULL",
    );

    await queryInterface.createTable("archive_holds", {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      entity_type: { type: Sequelize.STRING(64), allowNull: false },
      entity_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      reason: { type: Sequelize.STRING(255), allowNull: true },
      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("archive_holds", ["entity_type", "entity_id"], {
      name: "uq_archive_hold", unique: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("archive_holds");
    await queryInterface.removeIndex("archive_records", "idx_archive_purge_after");
    await queryInterface.removeColumn("archive_records", "hold_reason");
    await queryInterface.removeColumn("archive_records", "retention_hold");
    await queryInterface.removeColumn("archive_records", "purge_after");
  },
};
