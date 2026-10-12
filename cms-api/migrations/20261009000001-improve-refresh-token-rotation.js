"use strict";

const INDEX_NAME = "idx_refresh_tokens_token_hash";

module.exports = {
  async up(queryInterface, Sequelize) {
    const columns = await queryInterface.describeTable("refresh_tokens");
    if (!columns.revoked_at) {
      await queryInterface.addColumn("refresh_tokens", "revoked_at", {
        type: Sequelize.DATE,
        allowNull: true,
      });
    }

    const [indexes] = await queryInterface.sequelize.query("SHOW INDEX FROM refresh_tokens");
    if (!indexes.some((index) => index.Key_name === INDEX_NAME)) {
      await queryInterface.sequelize.query(
        `ALTER TABLE refresh_tokens ADD INDEX ${INDEX_NAME} (token(64))`,
      );
    }
  },

  async down(queryInterface) {
    const [indexes] = await queryInterface.sequelize.query("SHOW INDEX FROM refresh_tokens");
    if (indexes.some((index) => index.Key_name === INDEX_NAME)) {
      await queryInterface.removeIndex("refresh_tokens", INDEX_NAME);
    }
    const columns = await queryInterface.describeTable("refresh_tokens");
    if (columns.revoked_at) await queryInterface.removeColumn("refresh_tokens", "revoked_at");
  },
};
