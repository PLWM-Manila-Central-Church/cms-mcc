"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("services", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      title: { type: Sequelize.STRING(150), allowNull: false },
      service_date: { type: Sequelize.DATEONLY, allowNull: false },
      service_time: { type: Sequelize.TIME, allowNull: false },
      capacity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      total_parking_slots: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      response_deadline: { type: Sequelize.DATE, allowNull: true },
      status: {
        type: Sequelize.ENUM("draft", "published", "cancelled", "completed"),
        allowNull: false,
        defaultValue: "draft",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    await queryInterface.addIndex("services", {
      fields: ["service_date"],
      name: "idx_services_date",
    });

    await queryInterface.addIndex("services", {
      fields: ["status"],
      name: "idx_services_status",
    });
  },
  down: async (queryInterface) => queryInterface.dropTable("services"),
};
