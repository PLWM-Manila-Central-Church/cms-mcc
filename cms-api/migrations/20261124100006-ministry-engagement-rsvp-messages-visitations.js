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

    if (!(await tableExists(queryInterface, "ministry_activities"))) {
      await queryInterface.createTable("ministry_activities", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        ministry_group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        title: { type: Sequelize.STRING(180), allowNull: false },
        activity_type: {
          type: Sequelize.ENUM("fellowship", "bible_study", "outreach", "service", "camp", "meeting", "other"),
          allowNull: false,
          defaultValue: "fellowship",
        },
        activity_date: { type: Sequelize.DATEONLY, allowNull: false },
        start_time: { type: Sequelize.TIME, allowNull: true },
        end_time: { type: Sequelize.TIME, allowNull: true },
        location: { type: Sequelize.STRING(200), allowNull: true },
        description: { type: Sequelize.TEXT, allowNull: true },
        linked_service_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        linked_event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        rsvp_deadline: { type: Sequelize.DATE, allowNull: true },
        status: { type: Sequelize.ENUM("planned", "completed", "cancelled"), allowNull: false, defaultValue: "planned" },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("ministry_activities", ["ministry_group_id", "activity_date"], { name: "idx_ministry_act_group_date" });
    }

    if (!(await tableExists(queryInterface, "ministry_attendance_responses"))) {
      await queryInterface.createTable("ministry_attendance_responses", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        activity_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        response: { type: Sequelize.ENUM("yes", "no", "maybe", "no_response"), allowNull: false, defaultValue: "no_response" },
        decline_reason: { type: Sequelize.STRING(255), allowNull: true },
        responded_at: { type: Sequelize.DATE, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex("ministry_attendance_responses", ["activity_id", "member_id"], {
        unique: true,
        name: "uq_ministry_rsvp_activity_member",
      });
    }

    if (!(await tableExists(queryInterface, "ministry_activity_attendance"))) {
      await queryInterface.createTable("ministry_activity_attendance", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        activity_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        source: { type: Sequelize.ENUM("qr", "manual", "imported_service", "imported_event"), allowNull: false, defaultValue: "manual" },
        checked_in_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        recorded_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        ...ts,
      });
      await queryInterface.addIndex("ministry_activity_attendance", ["activity_id", "member_id"], {
        unique: true,
        name: "uq_ministry_att_activity_member",
      });
    }

    if (!(await tableExists(queryInterface, "ministry_announcements"))) {
      await queryInterface.createTable("ministry_announcements", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        ministry_group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        title: { type: Sequelize.STRING(180), allowNull: false },
        body: { type: Sequelize.TEXT, allowNull: false },
        is_pinned: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        published_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("ministry_announcements", ["ministry_group_id"], { name: "idx_ministry_ann_group" });
    }

    if (!(await tableExists(queryInterface, "member_messages"))) {
      await queryInterface.createTable("member_messages", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        ministry_group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        sender_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        direction: { type: Sequelize.ENUM("leader_to_member", "member_to_leader"), allowNull: false, defaultValue: "leader_to_member" },
        subject: { type: Sequelize.STRING(180), allowNull: true },
        body: { type: Sequelize.TEXT, allowNull: false },
        is_read: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        read_at: { type: Sequelize.DATE, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("member_messages", ["member_id"], { name: "idx_member_messages_member" });
    }

    if (!(await tableExists(queryInterface, "member_feedback"))) {
      await queryInterface.createTable("member_feedback", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        ministry_group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        category: { type: Sequelize.ENUM("prayer_request", "question", "suggestion", "care_needed"), allowNull: false, defaultValue: "prayer_request" },
        subject: { type: Sequelize.STRING(180), allowNull: true },
        message: { type: Sequelize.TEXT, allowNull: false },
        is_confidential: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 },
        status: { type: Sequelize.ENUM("open", "acknowledged", "prayed_for", "resolved"), allowNull: false, defaultValue: "open" },
        leader_response: { type: Sequelize.TEXT, allowNull: true },
        responded_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        responded_at: { type: Sequelize.DATE, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("member_feedback", ["ministry_group_id", "status"], { name: "idx_member_feedback_group_status" });
    }

    if (!(await tableExists(queryInterface, "pastoral_visitations"))) {
      await queryInterface.createTable("pastoral_visitations", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        ministry_group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        cell_group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        visit_date: { type: Sequelize.DATEONLY, allowNull: false },
        visit_type: { type: Sequelize.ENUM("home_visit", "phone_call", "hospital_visit", "counseling", "follow_up"), allowNull: false, defaultValue: "follow_up" },
        care_stage: {
          type: Sequelize.ENUM("needs_followup", "contacted", "in_progress", "visitation_scheduled", "completed"),
          allowNull: false,
          defaultValue: "contacted",
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        next_action_date: { type: Sequelize.DATEONLY, allowNull: true },
        visited_by_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("pastoral_visitations", ["member_id", "visit_date"], { name: "idx_pastoral_visit_member_date" });
    }

    // Extend existing attendance_follow_ups with 5-stage care_stage if table exists
    await addColIfMissing(queryInterface, "attendance_follow_ups", "care_stage", {
      type: Sequelize.ENUM("needs_followup", "contacted", "in_progress", "visitation_scheduled", "completed"),
      allowNull: false,
      defaultValue: "needs_followup",
    });
    await addColIfMissing(queryInterface, "attendance_follow_ups", "last_contacted_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    for (const t of [
      "pastoral_visitations", "member_feedback", "member_messages",
      "ministry_announcements", "ministry_activity_attendance",
      "ministry_attendance_responses", "ministry_activities",
    ]) {
      if (await tableExists(queryInterface, t)) await queryInterface.dropTable(t);
    }
  },
};
