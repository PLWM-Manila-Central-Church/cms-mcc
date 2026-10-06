"use strict";

const TABLES = [
  "attendance_batch_items",
  "event_attendances",
  "attendance_batches",
  "attendance_expected_members",
  "member_qr_credentials",
  "attendance_sessions",
];

async function countRows(queryInterface, table) {
  const rows = await queryInterface.sequelize.query(
    `SELECT COUNT(*) AS row_count FROM ${table}`,
    { type: queryInterface.sequelize.QueryTypes.SELECT },
  );
  return Number(rows[0]?.row_count || 0);
}

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("attendance_sessions", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      service_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "services", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      event_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "events", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      session_key: { type: Sequelize.STRING(80), allowNull: false, defaultValue: "primary" },
      title: { type: Sequelize.STRING(150), allowNull: false },
      starts_at: { type: Sequelize.DATE, allowNull: false },
      ends_at: { type: Sequelize.DATE, allowNull: false },
      check_in_opens_at: { type: Sequelize.DATE, allowNull: false },
      check_in_closes_at: { type: Sequelize.DATE, allowNull: false },
      approval_deadline: { type: Sequelize.DATE, allowNull: false },
      time_zone: { type: Sequelize.STRING(64), allowNull: false, defaultValue: "Asia/Manila" },
      status: {
        type: Sequelize.ENUM("draft", "open", "closed", "cancelled"),
        allowNull: false,
        defaultValue: "draft",
      },
      expected_basis: {
        type: Sequelize.ENUM("none", "registrations", "explicit_roster"),
        allowNull: false,
        defaultValue: "none",
      },
      registration_required: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
      leader_confirmation_mode: {
        type: Sequelize.ENUM("direct", "batch_review"),
        allowNull: false,
        defaultValue: "batch_review",
      },
      expected_roster_frozen_at: { type: Sequelize.DATE, allowNull: true },
      created_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("attendance_sessions", {
      fields: ["service_id"],
      unique: true,
      name: "unique_qr_service_session",
    });
    await queryInterface.addIndex("attendance_sessions", {
      fields: ["event_id", "session_key"],
      unique: true,
      name: "unique_qr_event_session_key",
    });
    await queryInterface.addIndex("attendance_sessions", {
      fields: ["status", "starts_at"],
      name: "idx_qr_session_status_start",
    });

    await queryInterface.createTable("member_qr_credentials", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      public_id: { type: Sequelize.UUID, allowNull: false, unique: true },
      version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
      status: {
        type: Sequelize.ENUM("active", "revoked"),
        allowNull: false,
        defaultValue: "active",
      },
      issued_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      issued_at: { type: Sequelize.DATE, allowNull: false },
      revoked_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      revoked_at: { type: Sequelize.DATE, allowNull: true },
      revoke_reason: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("member_qr_credentials", {
      fields: ["member_id", "version"],
      type: "unique",
      name: "unique_member_qr_version",
    });
    await queryInterface.addIndex("member_qr_credentials", {
      fields: ["member_id", "status"],
      name: "idx_member_qr_status",
    });

    await queryInterface.createTable("attendance_expected_members", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      session_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "attendance_sessions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      source: {
        type: Sequelize.ENUM("event_registration", "service_rsvp", "staff_added"),
        allowNull: false,
      },
      cell_group_id_at_freeze: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "cell_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      group_id_at_freeze: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "ministry_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("attendance_expected_members", {
      fields: ["session_id", "member_id"],
      type: "unique",
      name: "unique_qr_expected_session_member",
    });
    await queryInterface.addIndex("attendance_expected_members", {
      fields: ["session_id", "cell_group_id_at_freeze"],
      name: "idx_qr_expected_cell_group",
    });
    await queryInterface.addIndex("attendance_expected_members", {
      fields: ["session_id", "group_id_at_freeze"],
      name: "idx_qr_expected_group",
    });

    await queryInterface.createTable("attendance_batches", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      session_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "attendance_sessions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      public_id: { type: Sequelize.UUID, allowNull: false, unique: true },
      submitted_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      cell_group_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "cell_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      group_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "ministry_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      state: {
        type: Sequelize.ENUM("draft", "submitted", "approved", "rejected", "withdrawn"),
        allowNull: false,
        defaultValue: "draft",
      },
      revision: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
      content_digest: { type: Sequelize.STRING(64), allowNull: true },
      idempotency_key: { type: Sequelize.UUID, allowNull: false },
      supersedes_batch_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "attendance_batches", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      submitted_at: { type: Sequelize.DATE, allowNull: true },
      approval_deadline: { type: Sequelize.DATE, allowNull: false },
      reviewed_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      decision_reason: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("attendance_batches", {
      fields: ["submitted_by", "idempotency_key"],
      type: "unique",
      name: "unique_qr_batch_idempotency",
    });
    await queryInterface.addIndex("attendance_batches", {
      fields: ["session_id", "state", "submitted_at"],
      name: "idx_qr_batch_session_state",
    });
    await queryInterface.addIndex("attendance_batches", {
      fields: ["submitted_by", "session_id", "state"],
      name: "idx_qr_batch_owner_state",
    });
    await queryInterface.addIndex("attendance_batches", {
      fields: ["cell_group_id", "session_id", "state"],
      name: "idx_qr_batch_cell_scope",
    });
    await queryInterface.addIndex("attendance_batches", {
      fields: ["group_id", "session_id", "state"],
      name: "idx_qr_batch_group_scope",
    });

    await queryInterface.createTable("attendance_batch_items", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      batch_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "attendance_batches", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      captured_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      capture_method: {
        type: Sequelize.ENUM("qr", "manual"),
        allowNull: false,
      },
      captured_at: { type: Sequelize.DATE, allowNull: false },
      cell_group_id_at_capture: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "cell_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      group_id_at_capture: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "ministry_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      outcome: {
        type: Sequelize.ENUM("pending", "confirmed", "already_confirmed"),
        allowNull: false,
        defaultValue: "pending",
      },
      service_attendance_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "attendances", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      event_attendance_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("attendance_batch_items", {
      fields: ["batch_id", "member_id"],
      type: "unique",
      name: "unique_qr_batch_item_member",
    });
    await queryInterface.addIndex("attendance_batch_items", {
      fields: ["batch_id", "outcome"],
      name: "idx_qr_batch_item_outcome",
    });

    await queryInterface.createTable("event_attendances", {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
      },
      version: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
      session_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "attendance_sessions", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      check_in_method: {
        type: Sequelize.ENUM("qr", "manual", "leader_batch"),
        allowNull: false,
      },
      entry_source: {
        type: Sequelize.ENUM("direct", "leader_batch"),
        allowNull: false,
      },
      checked_in_at: { type: Sequelize.DATE, allowNull: false },
      recorded_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      confirmed_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      confirmed_at: { type: Sequelize.DATE, allowNull: false },
      source_batch_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "attendance_batches", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      cell_group_id_at_check_in: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "cell_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      group_id_at_check_in: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "ministry_groups", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      voided_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      voided_at: { type: Sequelize.DATE, allowNull: true },
      void_reason: { type: Sequelize.STRING(500), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addConstraint("event_attendances", {
      fields: ["session_id", "member_id"],
      type: "unique",
      name: "unique_qr_event_session_member",
    });
    await queryInterface.addIndex("event_attendances", {
      fields: ["session_id", "checked_in_at"],
      name: "idx_qr_event_attendance_time",
    });
    await queryInterface.addIndex("event_attendances", {
      fields: ["session_id", "cell_group_id_at_check_in"],
      name: "idx_qr_event_attendance_cell",
    });
    await queryInterface.addIndex("event_attendances", {
      fields: ["session_id", "group_id_at_check_in"],
      name: "idx_qr_event_attendance_group",
    });
    await queryInterface.addConstraint("attendance_batch_items", {
      fields: ["event_attendance_id"],
      type: "foreign key",
      name: "fk_qr_batch_item_event_attendance",
      references: { table: "event_attendances", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });

    await queryInterface.addColumn("attendances", "entry_source", {
      type: Sequelize.ENUM("legacy", "direct", "leader_batch"),
      allowNull: false,
      defaultValue: "legacy",
    });
    await queryInterface.addColumn("attendances", "source_batch_id", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addConstraint("attendances", {
      fields: ["source_batch_id"],
      type: "foreign key",
      name: "fk_attendance_qr_source_batch",
      references: { table: "attendance_batches", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
    await queryInterface.addColumn("attendances", "confirmed_by", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addColumn("attendances", "confirmed_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addConstraint("attendances", {
      fields: ["confirmed_by"],
      type: "foreign key",
      name: "fk_attendance_qr_confirmed_by",
      references: { table: "users", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addIndex("attendances", {
      fields: ["source_batch_id"],
      name: "idx_attendance_qr_batch",
    });
    await queryInterface.addColumn("attendances", "cell_group_id_at_check_in", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addColumn("attendances", "group_id_at_check_in", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addColumn("attendances", "voided_by", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await queryInterface.addColumn("attendances", "voided_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await queryInterface.addColumn("attendances", "void_reason", {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await queryInterface.addColumn("attendances", "qr_revision", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });
    await queryInterface.addConstraint("attendances", {
      fields: ["cell_group_id_at_check_in"],
      type: "foreign key",
      name: "fk_attendance_qr_cell_group_snapshot",
      references: { table: "cell_groups", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
    await queryInterface.addConstraint("attendances", {
      fields: ["group_id_at_check_in"],
      type: "foreign key",
      name: "fk_attendance_qr_group_snapshot",
      references: { table: "ministry_groups", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "RESTRICT",
    });
    await queryInterface.addConstraint("attendances", {
      fields: ["voided_by"],
      type: "foreign key",
      name: "fk_attendance_qr_voided_by",
      references: { table: "users", field: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
    await queryInterface.addIndex("attendances", {
      fields: ["service_id", "voided_at", "checked_in_at"],
      name: "idx_attendance_confirmed_service_time",
    });
  },

  down: async (queryInterface) => {
    const retainedTables = [
      "attendance_batch_items",
      "attendance_batches",
      "attendance_expected_members",
      "event_attendances",
      "member_qr_credentials",
      "attendance_sessions",
    ];
    for (const table of retainedTables) {
      if (await countRows(queryInterface, table)) {
        throw new Error(`Refusing to roll back QR attendance schema because ${table} contains data`);
      }
    }

    const qrServiceRows = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS row_count FROM attendances WHERE entry_source <> 'legacy' OR voided_at IS NOT NULL",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (Number(qrServiceRows[0]?.row_count || 0)) {
      throw new Error("Refusing to roll back QR attendance schema because service attendance has QR provenance or corrections");
    }

    await queryInterface.removeIndex("attendances", "idx_attendance_confirmed_service_time");
    await queryInterface.removeConstraint("attendances", "fk_attendance_qr_voided_by");
    await queryInterface.removeConstraint("attendances", "fk_attendance_qr_confirmed_by");
    await queryInterface.removeConstraint("attendances", "fk_attendance_qr_group_snapshot");
    await queryInterface.removeConstraint("attendances", "fk_attendance_qr_cell_group_snapshot");
    await queryInterface.removeConstraint("attendances", "fk_attendance_qr_source_batch");
    await queryInterface.removeIndex("attendances", "idx_attendance_qr_batch");
    for (const column of [
      "void_reason",
      "voided_at",
      "voided_by",
      "qr_revision",
      "group_id_at_check_in",
      "cell_group_id_at_check_in",
      "confirmed_at",
      "confirmed_by",
      "source_batch_id",
      "entry_source",
    ]) {
      await queryInterface.removeColumn("attendances", column);
    }
    for (const table of TABLES) {
      await queryInterface.dropTable(table);
    }
  },
};
