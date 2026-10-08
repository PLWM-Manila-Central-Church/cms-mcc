"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const events = await queryInterface.describeTable("events");
    if (!events.image_url) {
      await queryInterface.addColumn("events", "image_url", {
        type: Sequelize.STRING(1000),
        allowNull: true,
      });
    }
    if (!events.image_key) {
      await queryInterface.addColumn("events", "image_key", {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    }

    const members = await queryInterface.showIndex("members");
    const indexes = [
      ["idx_member_gender", ["gender"]],
      ["idx_member_birthdate", ["birthdate"]],
      ["idx_member_created_at", ["created_at"]],
      ["idx_member_group", ["group_id"]],
    ];
    for (const [name, fields] of indexes) {
      if (!members.some((index) => index.name === name)) {
        await queryInterface.addIndex("members", fields, { name });
      }
    }
  },

  async down() {
    throw new Error("Event image references and analytics indexes are additive; use a forward migration to change them.");
  },
};
