"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const CellGroupMeeting = sequelize.define(
  "CellGroupMeeting",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    cell_group_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    meeting_date: { type: DataTypes.DATEONLY, allowNull: false },
    meeting_time: { type: DataTypes.TIME, allowNull: true },
    location: { type: DataTypes.STRING(200), allowNull: true },
    lesson_topic: { type: DataTypes.STRING(200), allowNull: true },
    scripture_reference: { type: DataTypes.STRING(150), allowNull: true },
    prayer_notes: { type: DataTypes.TEXT, allowNull: true },
    attendees_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    visitors_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    recorded_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "cell_group_meetings", timestamps: true, underscored: true }
);

const CellGroupMeetingAttendance = sequelize.define(
  "CellGroupMeetingAttendance",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    meeting_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    member_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    status: { type: DataTypes.ENUM("present", "absent", "excused"), allowNull: false, defaultValue: "present" },
  },
  { tableName: "cell_group_meeting_attendance", timestamps: true, underscored: true }
);

const ServiceRecurrenceRule = sequelize.define(
  "ServiceRecurrenceRule",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    gathering_type: { type: DataTypes.STRING(40), allowNull: false, defaultValue: "lords_day" },
    day_of_week: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    start_time: { type: DataTypes.TIME, allowNull: true },
    end_time: { type: DataTypes.TIME, allowNull: true },
    venue: { type: DataTypes.STRING(200), allowNull: true },
    capacity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_active: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 1 },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "service_recurrence_rules", timestamps: true, underscored: true }
);

const ServiceProgramItem = sequelize.define(
  "ServiceProgramItem",
  {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sort_order: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    segment_type: {
      type: DataTypes.ENUM("worship", "prayer", "scripture", "sermon", "offering", "announcement", "benediction", "other"),
      allowNull: false,
      defaultValue: "other",
    },
    title: { type: DataTypes.STRING(180), allowNull: false },
    start_time: { type: DataTypes.TIME, allowNull: true },
    duration_minutes: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    assigned_person: { type: DataTypes.STRING(120), allowNull: true },
    notes: { type: DataTypes.TEXT, allowNull: true },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
  },
  { tableName: "service_program_items", timestamps: true, underscored: true }
);

module.exports = {
  CellGroupMeeting,
  CellGroupMeetingAttendance,
  ServiceRecurrenceRule,
  ServiceProgramItem,
};
