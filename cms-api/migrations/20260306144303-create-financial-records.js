"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("financial_records", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      category_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "financial_categories", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      receipt_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true,
      },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      transaction_date: { type: Sequelize.DATEONLY, allowNull: false },
      recorded_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      notes: { type: Sequelize.TEXT, allowNull: true },
      is_deleted: {
        type: Sequelize.TINYINT,
        allowNull: false,
        defaultValue: 0,
      },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      deleted_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("financial_records", {
      fields: ["transaction_date", "is_deleted"],
      name: "idx_financial_records_date_deleted",
    });
    await queryInterface.addIndex("financial_records", {
      fields: ["member_id", "is_deleted"],
      name: "idx_financial_records_member_deleted",
    });
    await queryInterface.addIndex("financial_records", {
      fields: ["category_id", "is_deleted"],
      name: "idx_financial_records_category_deleted",
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("financial_records"),
};
