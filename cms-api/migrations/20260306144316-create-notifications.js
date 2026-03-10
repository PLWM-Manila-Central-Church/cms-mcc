"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("notifications", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      type: { type: Sequelize.STRING(100), allowNull: false },
      message: { type: Sequelize.TEXT, allowNull: false },
      is_read: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
      read_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("notifications", {
      fields: ["user_id", "is_read"],
      name: "idx_notifications_user_read",
    });

    await queryInterface.addIndex("notifications", {
      fields: ["created_at"],
      name: "idx_notifications_created_at",
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("notifications"),
};
