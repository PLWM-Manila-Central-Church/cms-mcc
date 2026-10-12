"use strict";

const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const InventoryRequest = sequelize.define(
  "InventoryRequest",
  {
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
    },
    item_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    event_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    service_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    ministry_role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    requested_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    request_key: { type: DataTypes.STRING(64), allowNull: true },
    quantity: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    purpose: { type: DataTypes.STRING(255), allowNull: true },
    status: {
      type: DataTypes.ENUM("pending", "approved", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    },
    reviewed_by: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    review_note: { type: DataTypes.TEXT, allowNull: true },
  },
  {
    tableName: "inventory_requests",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ["requested_by", "status"], name: "idx_ir_requester_status" },
      { fields: ["requested_by", "request_key"], name: "uq_inventory_requests_requester_key", unique: true },
    ],
  },
);

module.exports = InventoryRequest;
