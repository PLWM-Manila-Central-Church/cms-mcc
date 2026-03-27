"use strict";

// Adds three leader-assignment columns to the users table:
// - leads_cell_group_id: the cell group this user leads (Cell Group Leader role)
// - leads_group_id:      the group this user leads (Group Leader role)
// - ministry_role_id:    the ministry this user leads (Ministry Leader — Reg Team with sub-role)

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("users", "leads_cell_group_id", {
      type:         Sequelize.INTEGER.UNSIGNED,
      allowNull:    true,
      defaultValue: null,
      after:        "member_id",
    });
    await queryInterface.addColumn("users", "leads_group_id", {
      type:         Sequelize.INTEGER.UNSIGNED,
      allowNull:    true,
      defaultValue: null,
      after:        "leads_cell_group_id",
    });
    await queryInterface.addColumn("users", "ministry_role_id", {
      type:         Sequelize.INTEGER.UNSIGNED,
      allowNull:    true,
      defaultValue: null,
      after:        "leads_group_id",
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("users", "leads_cell_group_id");
    await queryInterface.removeColumn("users", "leads_group_id");
    await queryInterface.removeColumn("users", "ministry_role_id");
  },
};
