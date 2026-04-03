"use strict";

// Creates the ministry_event_invites table.
// Each row represents one member invited to participate in an event
// on behalf of a specific ministry role.
// response_status lifecycle: pending → attending | not_attending

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ministry_event_invites", {
      id: {
        type:          Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey:    true,
      },
      event_id: {
        type:       Sequelize.INTEGER.UNSIGNED,
        allowNull:  false,
        references: { model: "events", key: "id" },
        onUpdate:   "CASCADE",
        onDelete:   "CASCADE",
      },
      ministry_role_id: {
        type:       Sequelize.INTEGER.UNSIGNED,
        allowNull:  false,
        references: { model: "ministry_roles", key: "id" },
        onUpdate:   "CASCADE",
        onDelete:   "RESTRICT",
      },
      member_id: {
        type:       Sequelize.INTEGER.UNSIGNED,
        allowNull:  false,
        references: { model: "members", key: "id" },
        onUpdate:   "CASCADE",
        onDelete:   "CASCADE",
      },
      invited_by: {
        type:       Sequelize.INTEGER.UNSIGNED,
        allowNull:  true,
        references: { model: "users", key: "id" },
        onUpdate:   "CASCADE",
        onDelete:   "SET NULL",
      },
      response_status: {
        type:         Sequelize.ENUM("pending", "attending", "not_attending"),
        allowNull:    false,
        defaultValue: "pending",
      },
      response_deadline: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
      responded_at: {
        type:      Sequelize.DATE,
        allowNull: true,
      },
      created_at: {
        type:         Sequelize.DATE,
        allowNull:    false,
        defaultValue: Sequelize.NOW,
      },
    });

    // Unique constraint: one invite per event + ministry + member
    await queryInterface.addIndex(
      "ministry_event_invites",
      ["event_id", "ministry_role_id", "member_id"],
      { unique: true, name: "uq_mei_event_role_member" }
    );
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("ministry_event_invites");
  },
};
