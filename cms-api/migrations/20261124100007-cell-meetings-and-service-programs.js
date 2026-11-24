"use strict";

const tableExists = async (queryInterface, name) => {
  const tables = await queryInterface.showAllTables();
  const names = tables.map((t) => (typeof t === "string" ? t : t.tableName || Object.values(t)[0]));
  return names.some((n) => String(n).toLowerCase() === name.toLowerCase());
};

const addColIfMissing = async (queryInterface, table, colName, def) => {
  if (!(await tableExists(queryInterface, table))) return;
  const desc = await queryInterface.describeTable(table);
  if (!desc[colName]) {
    await queryInterface.addColumn(table, colName, def);
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    };

    // 1. Enrich cell_groups
    await addColIfMissing(queryInterface, "cell_groups", "code", { type: Sequelize.STRING(32), allowNull: true });
    await addColIfMissing(queryInterface, "cell_groups", "leader_user_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "cell_groups", "assistant_leader_user_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "cell_groups", "ministry_group_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "cell_groups", "meeting_day", { type: Sequelize.STRING(32), allowNull: true });
    await addColIfMissing(queryInterface, "cell_groups", "meeting_time", { type: Sequelize.TIME, allowNull: true });
    await addColIfMissing(queryInterface, "cell_groups", "meeting_location", { type: Sequelize.STRING(200), allowNull: true });
    await addColIfMissing(queryInterface, "cell_groups", "status", {
      type: Sequelize.ENUM("active", "inactive", "archived"),
      allowNull: false,
      defaultValue: "active",
    });

    // 2. cell_group_meetings & attendance
    if (!(await tableExists(queryInterface, "cell_group_meetings"))) {
      await queryInterface.createTable("cell_group_meetings", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        cell_group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        meeting_date: { type: Sequelize.DATEONLY, allowNull: false },
        meeting_time: { type: Sequelize.TIME, allowNull: true },
        location: { type: Sequelize.STRING(200), allowNull: true },
        lesson_topic: { type: Sequelize.STRING(200), allowNull: true },
        scripture_reference: { type: Sequelize.STRING(150), allowNull: true },
        prayer_notes: { type: Sequelize.TEXT, allowNull: true },
        attendees_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        visitors_count: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        recorded_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("cell_group_meetings", ["cell_group_id", "meeting_date"], { name: "idx_cell_meetings_group_date" });
    }

    if (!(await tableExists(queryInterface, "cell_group_meeting_attendance"))) {
      await queryInterface.createTable("cell_group_meeting_attendance", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        meeting_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        status: { type: Sequelize.ENUM("present", "absent", "excused"), allowNull: false, defaultValue: "present" },
        ...ts,
      });
      await queryInterface.addIndex("cell_group_meeting_attendance", ["meeting_id", "member_id"], {
        unique: true,
        name: "uq_cell_meeting_att_member",
      });
    }

    // 3. Enrich services & recurrence rules & program items
    await addColIfMissing(queryInterface, "services", "end_time", { type: Sequelize.TIME, allowNull: true });
    await addColIfMissing(queryInterface, "services", "venue", { type: Sequelize.STRING(200), allowNull: true });
    await addColIfMissing(queryInterface, "services", "presiding_minister", { type: Sequelize.STRING(150), allowNull: true });
    await addColIfMissing(queryInterface, "services", "recurrence_rule_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });

    if (!(await tableExists(queryInterface, "service_recurrence_rules"))) {
      await queryInterface.createTable("service_recurrence_rules", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        title: { type: Sequelize.STRING(150), allowNull: false },
        gathering_type: { type: Sequelize.STRING(40), allowNull: false, defaultValue: "lords_day" },
        day_of_week: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 }, // 0=Sunday .. 6=Saturday
        start_time: { type: Sequelize.TIME, allowNull: true },
        end_time: { type: Sequelize.TIME, allowNull: true },
        venue: { type: Sequelize.STRING(200), allowNull: true },
        capacity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_active: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
    }

    if (!(await tableExists(queryInterface, "service_program_items"))) {
      await queryInterface.createTable("service_program_items", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        service_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        segment_type: {
          type: Sequelize.ENUM("worship", "prayer", "scripture", "sermon", "offering", "announcement", "benediction", "other"),
          allowNull: false,
          defaultValue: "other",
        },
        title: { type: Sequelize.STRING(180), allowNull: false },
        start_time: { type: Sequelize.TIME, allowNull: true },
        duration_minutes: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        assigned_person: { type: Sequelize.STRING(120), allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("service_program_items", ["service_id"], { name: "idx_service_program_service" });
    }

    // 4. Enrich ministry_assignments for servant confirmations
    await addColIfMissing(queryInterface, "ministry_assignments", "confirmation_status", {
      type: Sequelize.ENUM("pending", "confirmed", "declined", "substituted"),
      allowNull: false,
      defaultValue: "pending",
    });
    await addColIfMissing(queryInterface, "ministry_assignments", "confirmed_at", { type: Sequelize.DATE, allowNull: true });
    await addColIfMissing(queryInterface, "ministry_assignments", "decline_reason", { type: Sequelize.STRING(255), allowNull: true });
    await addColIfMissing(queryInterface, "ministry_assignments", "substitute_member_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "ministry_assignments", "notified_at", { type: Sequelize.DATE, allowNull: true });
  },

  async down(queryInterface) {
    for (const t of ["service_program_items", "service_recurrence_rules", "cell_group_meeting_attendance", "cell_group_meetings"]) {
      if (await tableExists(queryInterface, t)) await queryInterface.dropTable(t);
    }
  },
};
