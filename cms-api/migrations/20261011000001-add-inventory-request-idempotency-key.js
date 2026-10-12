"use strict";

const INDEX_NAME = "uq_inventory_requests_requester_key";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const columns = await queryInterface.describeTable("inventory_requests");
    if (!columns.request_key) {
      await queryInterface.addColumn("inventory_requests", "request_key", {
        type: Sequelize.STRING(64),
        allowNull: true,
      });
    }

    const indexes = await queryInterface.showIndex("inventory_requests");
    if (!indexes.some((index) => index.name === INDEX_NAME)) {
      await queryInterface.addIndex("inventory_requests", ["requested_by", "request_key"], {
        name: INDEX_NAME,
        unique: true,
      });
    }
  },

  down: async (queryInterface) => {
    const indexes = await queryInterface.showIndex("inventory_requests");
    if (indexes.some((index) => index.name === INDEX_NAME)) {
      await queryInterface.removeIndex("inventory_requests", INDEX_NAME);
    }

    const columns = await queryInterface.describeTable("inventory_requests");
    if (columns.request_key) await queryInterface.removeColumn("inventory_requests", "request_key");
  },
};
