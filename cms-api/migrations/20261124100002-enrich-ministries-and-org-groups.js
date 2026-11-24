"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Enrich ministry_groups (Life-Stage Ministries: HS, YA, Men's, Women's, Elementary, Preschool, Toddlers)
    const mgCols = await queryInterface.describeTable("ministry_groups");
    const mgAdditions = {
      code: { type: Sequelize.STRING(32), allowNull: true },
      description: { type: Sequelize.TEXT, allowNull: true },
      leader_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      assistant_leader_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      age_min: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
      age_max: { type: Sequelize.TINYINT.UNSIGNED, allowNull: true },
      status: { type: Sequelize.ENUM("Active", "Inactive", "Archived"), allowNull: false, defaultValue: "Active" },
      is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
      deleted_at: { type: Sequelize.DATE, allowNull: true },
      deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
    };
    for (const [colName, def] of Object.entries(mgAdditions)) {
      if (!mgCols[colName]) {
        await queryInterface.addColumn("ministry_groups", colName, def);
      }
    }

    // 2. Enrich ministry_roles (Organizational Groups & Service Teams: Choir, Ushers, Sound & Media, etc.)
    const mrCols = await queryInterface.describeTable("ministry_roles");
    const mrAdditions = {
      code: { type: Sequelize.STRING(32), allowNull: true },
      category: {
        type: Sequelize.ENUM("Department", "Service Team", "Committee", "Worship", "Operations", "Teaching", "Other"),
        allowNull: false,
        defaultValue: "Service Team",
      },
      description: { type: Sequelize.TEXT, allowNull: true },
      leader_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      assistant_leader_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
      established_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: { type: Sequelize.ENUM("Active", "Inactive", "Archived"), allowNull: false, defaultValue: "Active" },
    };
    for (const [colName, def] of Object.entries(mrAdditions)) {
      if (!mrCols[colName]) {
        await queryInterface.addColumn("ministry_roles", colName, def);
      }
    }

    // 3. Create group_positions (sub-teams / roles inside an organizational group)
    const tables = await queryInterface.showAllTables();
    const hasTable = (name) => tables.map((t) => (typeof t === "string" ? t : Object.values(t)[0]).toLowerCase()).includes(name.toLowerCase());

    if (!hasTable("group_positions")) {
      await queryInterface.createTable("group_positions", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        name: { type: Sequelize.STRING(120), allowNull: false },
        responsibilities: { type: Sequelize.TEXT, allowNull: true },
        sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
        deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("group_positions", ["group_id"], { name: "idx_group_positions_group" });
    }

    // 4. Create group_member_positions (multi-group membership with per-group position)
    if (!hasTable("group_member_positions")) {
      await queryInterface.createTable("group_member_positions", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        position_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        assigned_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        assigned_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        is_active: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
        deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("group_member_positions", ["group_id", "member_id"], { name: "idx_gmp_group_member" });
      await queryInterface.addIndex("group_member_positions", ["member_id"], { name: "idx_gmp_member" });
    }

    // 5. Create group_activities & group_tasks
    if (!hasTable("group_activities")) {
      await queryInterface.createTable("group_activities", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        title: { type: Sequelize.STRING(180), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        activity_date: { type: Sequelize.DATEONLY, allowNull: true },
        start_time: { type: Sequelize.TIME, allowNull: true },
        location: { type: Sequelize.STRING(200), allowNull: true },
        status: { type: Sequelize.ENUM("planned", "ongoing", "completed", "cancelled"), allowNull: false, defaultValue: "planned" },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
        deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("group_activities", ["group_id", "activity_date"], { name: "idx_group_activities_group_date" });
    }

    if (!hasTable("group_tasks")) {
      await queryInterface.createTable("group_tasks", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        activity_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        title: { type: Sequelize.STRING(200), allowNull: false },
        description: { type: Sequelize.TEXT, allowNull: true },
        assigned_member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        due_date: { type: Sequelize.DATEONLY, allowNull: true },
        status: { type: Sequelize.ENUM("pending", "in_progress", "completed", "cancelled"), allowNull: false, defaultValue: "pending" },
        completed_at: { type: Sequelize.DATE, allowNull: true },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
        deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("group_tasks", ["group_id", "status"], { name: "idx_group_tasks_group_status" });
    }
  },

  async down(queryInterface) {
    for (const table of ["group_tasks", "group_activities", "group_member_positions", "group_positions"]) {
      await queryInterface.dropTable(table).catch(() => {});
    }
  },
};
