"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ministry_schedules", {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      ministry_role_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      kind: { type: Sequelize.ENUM("practice", "cleaning", "service"), allowNull: false, defaultValue: "practice" },
      title: { type: Sequelize.STRING(150), allowNull: false },
      schedule_date: { type: Sequelize.DATEONLY, allowNull: false },
      start_time: { type: Sequelize.TIME, allowNull: true },
      end_time: { type: Sequelize.TIME, allowNull: true },
      location: { type: Sequelize.STRING(255), allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("ministry_schedules", ["ministry_role_id", "schedule_date"], {
      name: "idx_ms_role_date",
    });

    await queryInterface.createTable("bible_reading_progress", {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      reading_date: { type: Sequelize.DATEONLY, allowNull: false },
      completed_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("bible_reading_progress", ["member_id", "reading_date"], {
      name: "uq_brp_member_date",
      unique: true,
    });
    await queryInterface.addIndex("bible_reading_progress", ["reading_date"], { name: "idx_brp_date" });

    await queryInterface.createTable("group_memory_verses", {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      sunday_date: { type: Sequelize.DATEONLY, allowNull: false },
      reference: { type: Sequelize.STRING(120), allowNull: false },
      verse_text: { type: Sequelize.TEXT, allowNull: false },
      created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("group_memory_verses", ["group_id", "sunday_date"], {
      name: "uq_gmv_group_sunday",
      unique: true,
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable("group_memory_verses");
    await queryInterface.dropTable("bible_reading_progress");
    await queryInterface.dropTable("ministry_schedules");
  },
};
