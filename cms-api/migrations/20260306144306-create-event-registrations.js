"use strict";
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("event_registrations", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      event_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "events", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      registered_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("event_registrations", {
      fields: ["event_id", "member_id"],
      type: "unique",
      name: "unique_event_member_registration",
    });
  },
  down: async (queryInterface) =>
    queryInterface.dropTable("event_registrations"),
};
