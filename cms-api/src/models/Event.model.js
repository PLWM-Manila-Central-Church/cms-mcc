"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const Event = sequelize.define(
  "Event",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    category_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    calendar_source_key: { type: DataTypes.STRING(90), allowNull: true },
    title: { type: DataTypes.STRING(150), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    image_url: { type: DataTypes.STRING(1000), allowNull: true },
    image_key: { type: DataTypes.STRING(255), allowNull: true },
    start_date: { type: DataTypes.DATEONLY, allowNull: false },
    end_date: { type: DataTypes.DATEONLY, allowNull: true },
    start_time: { type: DataTypes.TIME, allowNull: true },
    end_time: { type: DataTypes.TIME, allowNull: true },
    location: { type: DataTypes.STRING(255), allowNull: true },
    capacity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    expected_participants: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    organizer_ministry_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    coordinator_user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    program_notes: { type: DataTypes.TEXT, allowNull: true },
    lifecycle_status: {
      type: DataTypes.ENUM("draft", "pending_approval", "approved", "published", "ongoing", "completed", "liquidated", "closed", "cancelled"),
      allowNull: false,
      defaultValue: "published",
    },
    total_parking_slots: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true, defaultValue: null },
    registration_deadline: { type: DataTypes.DATE, allowNull: true },
    status: {
      type: DataTypes.ENUM("Upcoming", "Ongoing", "Completed", "Cancelled"),
      allowNull: false,
      defaultValue: "Upcoming",
    },
    is_deleted: { type: DataTypes.TINYINT, allowNull: false, defaultValue: 0 },
    deleted_at: { type: DataTypes.DATE, allowNull: true },
    deleted_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    created_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  },
  {
    tableName: "events",
    timestamps: true,
    underscored: true,
    defaultScope: { where: { is_deleted: 0 } },
    scopes: { withDeleted: {} },
    indexes: [
      { fields: ["start_date", "status"], name: "idx_event_date_status" },
      { fields: ["status"], name: "idx_event_status" },
    ],
  },
);

module.exports = Event;
