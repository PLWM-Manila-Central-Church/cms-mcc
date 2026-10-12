"use strict";

module.exports = {
  async up(queryInterface) {
    const columns = await queryInterface.describeTable("financial_records");
    if (!columns.member_id) throw new Error("financial_records.member_id is required for anonymous giving.");

    if (columns.member_id.allowNull === false) {
      // TiDB can report the legacy Sequelize changeColumn as applied while
      // retaining NOT NULL. Use native MySQL-compatible DDL and verify it.
      await queryInterface.sequelize.query(
        "ALTER TABLE `financial_records` MODIFY COLUMN `member_id` INT UNSIGNED NULL",
      );
    }

    const [rows] = await queryInterface.sequelize.query(
      "SHOW COLUMNS FROM financial_records WHERE Field = 'member_id'",
    );
    if (String(rows[0]?.Null || "").toUpperCase() !== "YES") {
      throw new Error("financial_records.member_id is still NOT NULL; anonymous giving would fail.");
    }
  },

  async down(queryInterface) {
    const [rows] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM financial_records WHERE member_id IS NULL OR is_anonymous = 1",
    );
    if (Number(rows[0]?.count || 0) > 0) {
      throw new Error("Cannot require a member link while anonymous financial records exist.");
    }

    const columns = await queryInterface.describeTable("financial_records");
    if (columns.member_id?.allowNull) {
      await queryInterface.sequelize.query(
        "ALTER TABLE `financial_records` MODIFY COLUMN `member_id` INT UNSIGNED NOT NULL",
      );
    }
  },
};
