"use strict";

// Adds two deep-link columns to the notifications table:
// - reference_id:   the ID of the linked resource (event, service, ministry_invite)
// - reference_type: the type of the linked resource — used by the frontend
//                   to construct the deep-link URL when a notification is clicked

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("notifications", "reference_id", {
      type:         Sequelize.INTEGER.UNSIGNED,
      allowNull:    true,
      defaultValue: null,
      after:        "message",
    });
    await queryInterface.addColumn("notifications", "reference_type", {
      type:         Sequelize.STRING(50),
      allowNull:    true,
      defaultValue: null,
      after:        "reference_id",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("notifications", "reference_id");
    await queryInterface.removeColumn("notifications", "reference_type");
  },
};
