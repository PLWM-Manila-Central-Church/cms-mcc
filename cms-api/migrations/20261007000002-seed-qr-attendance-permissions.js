"use strict";

const { PERMISSIONS, ROLE_GRANTS } = require("../src/modules/qr-attendance/permissions");

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    const existingPermissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions WHERE module IN ('qr_attendance', 'member_qr')",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const existingSet = new Set(existingPermissions.map((row) => `${row.module}:${row.action}`));
    const toAdd = PERMISSIONS
      .filter(({ module, action }) => !existingSet.has(`${module}:${action}`))
      .map(({ module, action, description }) => ({
        module,
        action,
        description,
        created_at: now,
        updated_at: now,
      }));

    if (toAdd.length) await queryInterface.bulkInsert("permissions", toAdd);

    const permissionRows = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions WHERE module IN ('qr_attendance', 'member_qr')",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const permissionIds = new Map(permissionRows.map((row) => [
      `${row.module}:${row.action}`,
      row.id,
    ]));

    const toggleRows = await queryInterface.sequelize.query(
      "SELECT id FROM system_settings WHERE `key` = 'qr_attendance_enabled' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (!toggleRows.length) {
      await queryInterface.bulkInsert("system_settings", [{
        key: "qr_attendance_enabled",
        value: "false",
        updated_by: null,
        updated_at: now,
      }]);
    }

    const roles = await queryInterface.sequelize.query(
      "SELECT id, role_name FROM roles",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (!roles.length) return;

    const roleIds = new Map(roles.map((row) => [row.role_name, row.id]));
    const rolePermissionRows = [];
    for (const [roleName, grants] of Object.entries(ROLE_GRANTS)) {
      const roleId = roleIds.get(roleName);
      if (!roleId) continue;
      for (const [module, action] of grants) {
        const permissionId = permissionIds.get(`${module}:${action}`);
        if (permissionId) rolePermissionRows.push({ role_id: roleId, permission_id: permissionId });
      }
    }

    for (const grant of rolePermissionRows) {
      const exists = await queryInterface.sequelize.query(
        "SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :permission_id LIMIT 1",
        {
          replacements: grant,
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (!exists.length) {
        await queryInterface.bulkInsert("role_permissions", [{ ...grant, created_at: now }]);
      }
    }
  },

  down: async (queryInterface) => {
    const toggleRows = await queryInterface.sequelize.query(
      "SELECT value FROM system_settings WHERE `key` = 'qr_attendance_enabled' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (String(toggleRows[0]?.value).toLowerCase() === "true") {
      throw new Error("Disable QR attendance in Settings before removing its permissions");
    }

    for (const table of [
      "member_qr_credentials",
      "attendance_expected_members",
      "attendance_batch_items",
      "attendance_batches",
      "event_attendances",
      "attendance_sessions",
    ]) {
      const rows = await queryInterface.sequelize.query(
        `SELECT COUNT(*) AS row_count FROM ${table}`,
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      if (Number(rows[0]?.row_count || 0)) {
        throw new Error(`Refusing to remove QR attendance permissions while ${table} contains data`);
      }
    }

    const roles = await queryInterface.sequelize.query(
      "SELECT id, role_name FROM roles WHERE role_name IN (:role_names)",
      {
        replacements: { role_names: Object.keys(ROLE_GRANTS) },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions WHERE module IN ('qr_attendance', 'member_qr')",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const roleIds = new Set(roles.map((role) => Number(role.id)));
    const permissionIds = new Set(permissions.map((permission) => Number(permission.id)));

    if (roleIds.size && permissionIds.size) {
      await queryInterface.bulkDelete("role_permissions", {
        role_id: [...roleIds],
        permission_id: [...permissionIds],
      });
    }
    if (permissionIds.size) {
      await queryInterface.bulkDelete("permissions", { id: [...permissionIds] });
    }
    await queryInterface.bulkDelete("system_settings", { key: "qr_attendance_enabled" });
  },
};
