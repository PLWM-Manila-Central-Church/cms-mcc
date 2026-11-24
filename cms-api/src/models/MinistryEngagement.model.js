"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const MinistryActivity = sequelize.define(
  "MinistryActivity",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    ministry_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(180), allowNull: false },
    activity_type: {
      type: DataTypes.ENUM("fellowship", "bible_study", "outreach", "service", "camp", "meeting", "other"),
      allowNull: false,
      defaultValue: "fellowship",
    },
    activity_date: { type: DataTypes.DATEONLY, allowNull: false },
    start_time: { type: DataTypes.TIME, allowNull: true },
    end_time: { type: DataTypes.TIME, allowNull: true },
    location: { type: DataTypes.STRING(200), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    linked_service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    linked_event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    rsvp_deadline: { type: DataTypes.DATE, allowNull: true },
    status: { type: DataTypes.ENUM("planned", "completed", "cancelled"), allowNull: false, defaultValue: "planned" },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "ministry_activities", timestamps: true, underscored: true }
);

const MinistryAttendanceResponse = sequelize.define(
  "MinistryAttendanceResponse",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    activity_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    response: { type: DataTypes.ENUM("yes", "no", "maybe", "no_response"), allowNull: false, defaultValue: "no_response" },
    decline_reason: { type: DataTypes.STRING(255), allowNull: true },
    responded_at: { type: DataTypes.DATE, allowNull: true },
  },
  { tableName: "ministry_attendance_responses", timestamps: true, underscored: true }
);

const MinistryActivityAttendance = sequelize.define(
  "MinistryActivityAttendance",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    activity_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    source: { type: DataTypes.ENUM("qr", "manual", "imported_service", "imported_event"), allowNull: false, defaultValue: "manual" },
    checked_in_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    recorded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  },
  { tableName: "ministry_activity_attendance", timestamps: true, underscored: true }
);

const MinistryAnnouncement = sequelize.define(
  "MinistryAnnouncement",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    ministry_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING(180), allowNull: false },
    body: { type: DataTypes.TEXT, allowNull: false },
    is_pinned: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    published_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "ministry_announcements", timestamps: true, underscored: true }
);

const MemberMessage = sequelize.define(
  "MemberMessage",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    ministry_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sender_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    direction: { type: DataTypes.ENUM("leader_to_member", "member_to_leader"), allowNull: false, defaultValue: "leader_to_member" },
    subject: { type: DataTypes.STRING(180), allowNull: true },
    body: { type: DataTypes.TEXT, allowNull: false },
    is_read: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    read_at: { type: DataTypes.DATE, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "member_messages", timestamps: true, underscored: true }
);

const MemberFeedback = sequelize.define(
  "MemberFeedback",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ministry_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    category: { type: DataTypes.ENUM("prayer_request", "question", "suggestion", "care_needed"), allowNull: false, defaultValue: "prayer_request" },
    subject: { type: DataTypes.STRING(180), allowNull: true },
    message: { type: DataTypes.TEXT, allowNull: false },
    is_confidential: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    status: { type: DataTypes.ENUM("open", "acknowledged", "prayed_for", "resolved"), allowNull: false, defaultValue: "open" },
    leader_response: { type: DataTypes.TEXT, allowNull: true },
    responded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    responded_at: { type: DataTypes.DATE, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "member_feedback", timestamps: true, underscored: true }
);

const PastoralVisitation = sequelize.define(
  "PastoralVisitation",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    ministry_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    cell_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    visit_date: { type: DataTypes.DATEONLY, allowNull: false },
    visit_type: { type: DataTypes.ENUM("home_visit", "phone_call", "hospital_visit", "counseling", "follow_up"), allowNull: false, defaultValue: "follow_up" },
    care_stage: {
      type: DataTypes.ENUM("needs_followup", "contacted", "in_progress", "visitation_scheduled", "completed"),
      allowNull: false,
      defaultValue: "contacted",
    },
    notes: { type: DataTypes.TEXT, allowNull: true },
    next_action_date: { type: DataTypes.DATEONLY, allowNull: true },
    visited_by_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "pastoral_visitations", timestamps: true, underscored: true }
);

module.exports = {
  MinistryActivity,
  MinistryAttendanceResponse,
  MinistryActivityAttendance,
  MinistryAnnouncement,
  MemberMessage,
  MemberFeedback,
  PastoralVisitation,
};
