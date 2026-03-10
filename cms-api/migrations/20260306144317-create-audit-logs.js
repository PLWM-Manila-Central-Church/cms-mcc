"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("audit_logs", {
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
        onDelete: "RESTRICT",
      },
      action: { type: Sequelize.STRING(100), allowNull: false },
      target_table: { type: Sequelize.STRING(100), allowNull: true },
      target_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      old_values: { type: Sequelize.JSON, allowNull: true },
      new_values: { type: Sequelize.JSON, allowNull: true },
      ip_address: { type: Sequelize.STRING(45), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("audit_logs", {
      fields: ["action"],
      name: "idx_audit_logs_action",
    });

    await queryInterface.addIndex("audit_logs", {
      fields: ["created_at"],
      name: "idx_audit_logs_created_at",
    });

    await queryInterface.addIndex("audit_logs", {
      fields: ["target_table", "target_id"],
      name: "idx_audit_logs_target",
    });

    await queryInterface.addIndex("audit_logs", {
      fields: ["user_id", "created_at"],
      name: "idx_audit_logs_user_date",
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("audit_logs"),
};
