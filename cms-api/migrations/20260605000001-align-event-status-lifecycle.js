"use strict";

const oldStatuses = ["draft", "published", "cancelled", "completed"];
const newStatuses = ["Upcoming", "Ongoing", "Completed", "Cancelled"];

const changeStatusColumn = (queryInterface, Sequelize, values, defaultValue) =>
  queryInterface.changeColumn("events", "status", {
    type: Sequelize.ENUM(...values),
    allowNull: false,
    defaultValue,
  });

const changeStatusColumnToString = (queryInterface, Sequelize, defaultValue) =>
  queryInterface.changeColumn("events", "status", {
    type: Sequelize.STRING(32),
    allowNull: false,
    defaultValue,
  });

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await changeStatusColumnToString(queryInterface, Sequelize, "Upcoming");

    await queryInterface.sequelize.query(`
      UPDATE events
      SET status = CASE status
        WHEN 'draft' THEN 'Upcoming'
        WHEN 'published' THEN 'Upcoming'
        WHEN 'completed' THEN 'Completed'
        WHEN 'cancelled' THEN 'Cancelled'
        ELSE status
      END
    `);

    await changeStatusColumn(queryInterface, Sequelize, newStatuses, "Upcoming");
  },

  down: async (queryInterface, Sequelize) => {
    await changeStatusColumnToString(queryInterface, Sequelize, "draft");

    await queryInterface.sequelize.query(`
      UPDATE events
      SET status = CASE status
        WHEN 'Upcoming' THEN 'published'
        WHEN 'Ongoing' THEN 'published'
        WHEN 'Completed' THEN 'completed'
        WHEN 'Cancelled' THEN 'cancelled'
        ELSE status
      END
    `);

    await changeStatusColumn(queryInterface, Sequelize, oldStatuses, "draft");
  },
};
