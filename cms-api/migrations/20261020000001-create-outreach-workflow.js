"use strict";

const TABLES = ["outreach_preferences", "outreach_session_policies", "attendance_exceptions", "attendance_follow_ups", "outreach_deliveries", "outreach_delivery_attempts"];
module.exports = {
  async up(qi, S) {
    const pk = () => ({ type: S.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true });
    const ref = (table, nullable = false) => ({
      type: S.INTEGER.UNSIGNED, allowNull: nullable, references: { model: table, key: "id" },
      onUpdate: "CASCADE", onDelete: nullable ? "SET NULL" : "RESTRICT",
    });
    const boolean = (value) => ({ type: S.BOOLEAN, allowNull: false, defaultValue: value });
    const string = (size, nullable = false) => ({ type: S.STRING(size), allowNull: nullable });
    const date = (nullable = true) => ({ type: S.DATE, allowNull: nullable });
    const revision = () => ({ type: S.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 });
    const definitions = {
      outreach_preferences: {
        member_id: ref("members"), sms_enabled: boolean(false), activity_reminders: boolean(true), attendance_followups: boolean(true),
        consent_phone: string(20, true), consent_at: date(), consent_source: string(30, true), consent_note: string(500, true),
        recorded_by: ref("users", true), opted_out_at: date(),
      },
      outreach_session_policies: {
        session_id: ref("attendance_sessions"), reminders_enabled: boolean(false), followups_enabled: boolean(false),
        series_key: { ...string(80), defaultValue: "church_gatherings" }, reminders_enabled_at: date(),
        updated_by: ref("users", true), revision: revision(),
      },
      attendance_exceptions: {
        session_id: ref("attendance_sessions"), member_id: ref("members"),
        status: { type: S.ENUM("excused", "pending", "cleared"), allowNull: false }, reason: string(500), updated_by: ref("users", true),
      },
      attendance_follow_ups: {
        member_id: ref("members"), series_key: string(80), episode_key: string(64),
        episode_start_session_id: ref("attendance_sessions"), trigger_session_id: ref("attendance_sessions"),
        absence_count: { type: S.INTEGER.UNSIGNED, allowNull: false },
        status: { type: S.ENUM("open", "assigned", "resolved", "cancelled"), allowNull: false, defaultValue: "open" },
        assigned_to: ref("users", true), assigned_by: ref("users", true), resolved_by: ref("users", true),
        resolved_at: date(), resolution_note: string(1000, true), cancel_reason: string(200, true), revision: revision(),
      },
      outreach_deliveries: {
        member_id: ref("members"), user_id: ref("users", true), session_id: ref("attendance_sessions", true),
        follow_up_id: ref("attendance_follow_ups", true), channel: { type: S.ENUM("in_app", "sms"), allowNull: false },
        kind: { type: S.ENUM("activity_reminder", "absence_followup"), allowNull: false },
        reminder_days: { type: S.INTEGER.UNSIGNED, allowNull: true }, idempotency_key: string(64), message: string(1000),
        recipient_phone: string(20, true),
        status: { type: S.ENUM("queued", "processing", "simulated", "sent", "delivered", "failed", "unknown", "cancelled", "skipped"), allowNull: false, defaultValue: "queued" },
        delivery_mode: string(20, true), scheduled_at: date(false), expires_at: date(false), next_attempt_at: date(false),
        lease_until: date(), claim_token: string(36, true), attempt_count: { type: S.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        provider_message_id: string(150, true), provider_status_checked_at: date(), last_error_code: string(80, true),
        notification_id: ref("notifications", true), sent_at: date(), delivered_at: date(),
      },
      outreach_delivery_attempts: {
        delivery_id: ref("outreach_deliveries"), attempt_number: { type: S.INTEGER.UNSIGNED, allowNull: false },
        mode: string(20), status: string(30), error_code: string(80, true), provider_message_id: string(150, true),
        started_at: date(false), finished_at: date(),
      },
    };
    const tableNames = new Set((await qi.showAllTables()).map((table) => typeof table === "string" ? table : Object.values(table)[0]));
    for (const table of TABLES) {
      if (!tableNames.has(table)) await qi.createTable(table, {
        id: pk(), ...definitions[table], created_at: date(false), updated_at: date(false),
      });
    }
    const indexes = [
      ["outreach_preferences", ["member_id"], "uq_outreach_preference_member", true],
      ["outreach_session_policies", ["session_id"], "uq_outreach_policy_session", true],
      ["outreach_session_policies", ["followups_enabled", "series_key"], "idx_outreach_policy_series"],
      ["attendance_exceptions", ["session_id", "member_id"], "uq_attendance_exception_member", true],
      ["attendance_follow_ups", ["episode_key"], "uq_outreach_absence_episode", true],
      ["attendance_follow_ups", ["member_id", "series_key", "status"], "idx_outreach_case_member"],
      ["attendance_follow_ups", ["assigned_to", "status"], "idx_outreach_case_assignee"],
      ["outreach_deliveries", ["idempotency_key"], "uq_outreach_delivery_key", true],
      ["outreach_deliveries", ["status", "next_attempt_at", "id"], "idx_outreach_delivery_due"],
      ["outreach_deliveries", ["member_id", "created_at"], "idx_outreach_delivery_member"],
      ["outreach_deliveries", ["follow_up_id", "channel"], "idx_outreach_delivery_case"],
      ["outreach_deliveries", ["provider_message_id"], "idx_outreach_provider_message"],
      ["outreach_delivery_attempts", ["delivery_id", "attempt_number"], "uq_outreach_attempt", true],
      ["attendance_expected_members", ["member_id", "session_id"], "idx_outreach_expected_history"],
    ];
    for (const [table, fields, name, unique = false] of indexes) {
      if (!(await qi.showIndex(table)).some((index) => index.name === name)) await qi.addIndex(table, { fields, name, unique });
    }
    const roleGrants = {
      "System Admin": ["read", "manage", "resolve", "configure", "process"],
      "Registration Team": ["read", "manage", "resolve", "process"], Pastor: ["read", "resolve"],
      Leader: ["read", "resolve"], "Cell Group Leader": ["read", "resolve"],
      "Group Leader": ["read", "resolve"], "Ministry Leader": ["read", "resolve"],
    };
    const now = new Date();
    for (const action of ["read", "manage", "resolve", "configure", "process"]) {
      const rows = await qi.sequelize.query("SELECT id FROM permissions WHERE module = 'outreach' AND action = :action", {
        replacements: { action }, type: qi.sequelize.QueryTypes.SELECT,
      });
      if (!rows.length) await qi.bulkInsert("permissions", [{ module: "outreach", action, description: "Notification and attendance follow-up " + action, created_at: now, updated_at: now }]);
    }
    const permissions = await qi.sequelize.query("SELECT id, action FROM permissions WHERE module = 'outreach'", { type: qi.sequelize.QueryTypes.SELECT });
    const roles = await qi.sequelize.query("SELECT id, role_name FROM roles", { type: qi.sequelize.QueryTypes.SELECT });
    for (const role of roles) for (const permission of permissions) {
      if (!(roleGrants[role.role_name] || []).includes(permission.action)) continue;
      const rows = await qi.sequelize.query("SELECT id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permissionId", {
        replacements: { roleId: role.id, permissionId: permission.id }, type: qi.sequelize.QueryTypes.SELECT,
      });
      if (!rows.length) await qi.bulkInsert("role_permissions", [{ role_id: role.id, permission_id: permission.id, created_at: now }]);
    }
  },
  async down(qi) {
    for (const table of TABLES) {
      const rows = await qi.sequelize.query("SELECT COUNT(*) AS total FROM " + qi.queryGenerator.quoteTable(table), { type: qi.sequelize.QueryTypes.SELECT });
      if (Number(rows[0].total)) throw new Error("Refusing to remove notification or follow-up history: " + table);
    }
    await qi.sequelize.query("DELETE rp FROM role_permissions rp JOIN permissions p ON p.id = rp.permission_id WHERE p.module = 'outreach'");
    await qi.bulkDelete("permissions", { module: "outreach" });
    await qi.removeIndex("attendance_expected_members", "idx_outreach_expected_history");
    for (const table of [...TABLES].reverse()) await qi.dropTable(table);
  },
};
