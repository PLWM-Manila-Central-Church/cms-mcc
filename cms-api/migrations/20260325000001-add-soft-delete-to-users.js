"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "is_deleted", {
      type: Sequelize.TINYINT,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.addColumn("users", "deleted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });

    await queryInterface.addIndex("users", {
      fields: ["is_deleted"],
      name: "idx_users_is_deleted",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeIndex("users", "idx_users_is_deleted");
    await queryInterface.removeColumn("users", "deleted_at");
    await queryInterface.removeColumn("users", "is_deleted");
  },
};