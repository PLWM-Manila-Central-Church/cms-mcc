"use strict";

const COLUMN_NAME = "user_session_id";
const INDEX_NAME = "idx_refresh_tokens_user_session_id";
const CONSTRAINT_NAME = "fk_refresh_tokens_user_session";

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable("refresh_tokens");
    if (!columns[COLUMN_NAME]) {
      await queryInterface.addColumn("refresh_tokens", COLUMN_NAME, {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      });
    }

    const [indexes] = await queryInterface.sequelize.query("SHOW INDEX FROM refresh_tokens");
    if (!indexes.some((index) => index.Key_name === INDEX_NAME)) {
      await queryInterface.addIndex("refresh_tokens", [COLUMN_NAME], { name: INDEX_NAME });
    }

    const [constraints] = await queryInterface.sequelize.query(
      "SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE " +
      "WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'refresh_tokens' " +
      "AND COLUMN_NAME = 'user_session_id' AND REFERENCED_TABLE_NAME = 'user_sessions'",
    );
    if (!constraints.some((constraint) => constraint.CONSTRAINT_NAME === CONSTRAINT_NAME)) {
      await queryInterface.sequelize.query(
        `ALTER TABLE refresh_tokens ADD CONSTRAINT ${CONSTRAINT_NAME} ` +
        "FOREIGN KEY (user_session_id) REFERENCES user_sessions(id) " +
        "ON DELETE SET NULL ON UPDATE CASCADE",
      );
    }
  },

  async down() {
    throw new Error("Forward-only migration: preserve refresh-token session audit linkage");
  },
};
