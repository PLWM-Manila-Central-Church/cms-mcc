"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const roles = await queryInterface.sequelize.query(
      "SELECT id, role_name FROM roles",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const roleMap = {};
    roles.forEach(r => roleMap[r.role_name] = r.id);

    if (Object.keys(roleMap).length === 0) {
      console.log("No roles found - skipping role_permissions seeder");
      return;
    }

    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    const p = (module, action) => {
      const found = permissions.find(perm => perm.module === module && perm.action === action);
      return found ? found.id : null;
    };

    const getRoleId = (roleName) => roleMap[roleName] || null;

    const rolePermissions = [
      // ── System Admin — all permissions ──────────────────────
      { role_name: "System Admin", module: "members", action: "read" },
      { role_name: "System Admin", module: "members", action: "create" },
      { role_name: "System Admin", module: "members", action: "update" },
      { role_name: "System Admin", module: "members", action: "delete" },
      { role_name: "System Admin", module: "users", action: "read" },
      { role_name: "System Admin", module: "users", action: "create" },
      { role_name: "System Admin", module: "users", action: "update" },
      { role_name: "System Admin", module: "users", action: "delete" },
      { role_name: "System Admin", module: "roles", action: "read" },
      { role_name: "System Admin", module: "roles", action: "create" },
      { role_name: "System Admin", module: "roles", action: "update" },
      { role_name: "System Admin", module: "roles", action: "delete" },
      { role_name: "System Admin", module: "attendance", action: "read" },
      { role_name: "System Admin", module: "attendance", action: "create" },
      { role_name: "System Admin", module: "attendance", action: "update" },
      { role_name: "System Admin", module: "attendance", action: "delete" },
      { role_name: "System Admin", module: "services", action: "read" },
      { role_name: "System Admin", module: "services", action: "create" },
      { role_name: "System Admin", module: "services", action: "update" },
      { role_name: "System Admin", module: "services", action: "delete" },
      { role_name: "System Admin", module: "finance", action: "read" },
      { role_name: "System Admin", module: "finance", action: "create" },
      { role_name: "System Admin", module: "finance", action: "update" },
      { role_name: "System Admin", module: "finance", action: "delete" },
      { role_name: "System Admin", module: "events", action: "read" },
      { role_name: "System Admin", module: "events", action: "create" },
      { role_name: "System Admin", module: "events", action: "update" },
      { role_name: "System Admin", module: "events", action: "delete" },
      { role_name: "System Admin", module: "inventory", action: "read" },
      { role_name: "System Admin", module: "inventory", action: "create" },
      { role_name: "System Admin", module: "inventory", action: "update" },
      { role_name: "System Admin", module: "inventory", action: "delete" },
      { role_name: "System Admin", module: "archives", action: "read" },
      { role_name: "System Admin", module: "archives", action: "create" },
      { role_name: "System Admin", module: "archives", action: "update" },
      { role_name: "System Admin", module: "archives", action: "delete" },
      { role_name: "System Admin", module: "ministry", action: "read" },
      { role_name: "System Admin", module: "ministry", action: "create" },
      { role_name: "System Admin", module: "ministry", action: "update" },
      { role_name: "System Admin", module: "ministry", action: "delete" },
      { role_name: "System Admin", module: "cell_groups", action: "read" },
      { role_name: "System Admin", module: "cell_groups", action: "create" },
      { role_name: "System Admin", module: "cell_groups", action: "update" },
      { role_name: "System Admin", module: "cell_groups", action: "delete" },
      { role_name: "System Admin", module: "notifications", action: "read" },
      { role_name: "System Admin", module: "notifications", action: "create" },
      { role_name: "System Admin", module: "notifications", action: "update" },
      { role_name: "System Admin", module: "notifications", action: "delete" },
      { role_name: "System Admin", module: "settings", action: "read" },
      { role_name: "System Admin", module: "settings", action: "create" },
      { role_name: "System Admin", module: "settings", action: "update" },
      { role_name: "System Admin", module: "settings", action: "delete" },
      { role_name: "System Admin", module: "audit", action: "read" },

      // ── Pastor — read everything + approve archives ──────────
      { role_name: "Pastor", module: "members", action: "read" },
      { role_name: "Pastor", module: "attendance", action: "read" },
      { role_name: "Pastor", module: "finance", action: "read" },
      { role_name: "Pastor", module: "events", action: "read" },
      { role_name: "Pastor", module: "services", action: "read" },
      { role_name: "Pastor", module: "inventory", action: "read" },
      { role_name: "Pastor", module: "archives", action: "read" },
      { role_name: "Pastor", module: "archives", action: "update" },
      { role_name: "Pastor", module: "ministry", action: "read" },
      { role_name: "Pastor", module: "cell_groups", action: "read" },
      { role_name: "Pastor", module: "audit", action: "read" },

      // ── Registration Team ────────────────────────────────────
      { role_name: "Registration Team", module: "members", action: "read" },
      { role_name: "Registration Team", module: "members", action: "create" },
      { role_name: "Registration Team", module: "members", action: "update" },
      { role_name: "Registration Team", module: "users", action: "read" },
      { role_name: "Registration Team", module: "users", action: "create" },
      { role_name: "Registration Team", module: "users", action: "update" },
      { role_name: "Registration Team", module: "attendance", action: "read" },
      { role_name: "Registration Team", module: "attendance", action: "create" },
      { role_name: "Registration Team", module: "events", action: "read" },
      { role_name: "Registration Team", module: "events", action: "create" },
      { role_name: "Registration Team", module: "events", action: "update" },
      { role_name: "Registration Team", module: "services", action: "read" },
      { role_name: "Registration Team", module: "services", action: "create" },
      { role_name: "Registration Team", module: "inventory", action: "read" },
      { role_name: "Registration Team", module: "archives", action: "read" },
      { role_name: "Registration Team", module: "archives", action: "create" },
      { role_name: "Registration Team", module: "cell_groups", action: "read" },
      { role_name: "Registration Team", module: "ministry", action: "read" },
      { role_name: "Registration Team", module: "ministry", action: "create" },

      // ── Finance Team ─────────────────────────────────────────
      { role_name: "Finance Team", module: "members", action: "read" },
      { role_name: "Finance Team", module: "finance", action: "read" },
      { role_name: "Finance Team", module: "finance", action: "create" },
      { role_name: "Finance Team", module: "finance", action: "update" },
      { role_name: "Finance Team", module: "archives", action: "read" },

      // ── Cell Group Leader ─────────────────────────────────────
      { role_name: "Cell Group Leader", module: "members", action: "read" },
      { role_name: "Cell Group Leader", module: "members", action: "update" },
      { role_name: "Cell Group Leader", module: "attendance", action: "read" },
      { role_name: "Cell Group Leader", module: "events", action: "read" },
      { role_name: "Cell Group Leader", module: "services", action: "read" },
      { role_name: "Cell Group Leader", module: "inventory", action: "read" },
      { role_name: "Cell Group Leader", module: "inventory", action: "create" },
      { role_name: "Cell Group Leader", module: "archives", action: "read" },
      { role_name: "Cell Group Leader", module: "cell_groups", action: "read" },
      { role_name: "Cell Group Leader", module: "ministry", action: "read" },

      // ── Group Leader ──────────────────────────────────────────
      { role_name: "Group Leader", module: "members", action: "read" },
      { role_name: "Group Leader", module: "members", action: "update" },
      { role_name: "Group Leader", module: "attendance", action: "read" },
      { role_name: "Group Leader", module: "events", action: "read" },
      { role_name: "Group Leader", module: "services", action: "read" },
      { role_name: "Group Leader", module: "inventory", action: "read" },
      { role_name: "Group Leader", module: "inventory", action: "create" },
      { role_name: "Group Leader", module: "archives", action: "read" },
      { role_name: "Group Leader", module: "ministry", action: "read" },

      // ── Ministry Leader ─────────────────────────────────────────
      // Ministry page permissions
      { role_name: "Ministry Leader", module: "ministry", action: "read" },
      { role_name: "Ministry Leader", module: "ministry", action: "create" },
      { role_name: "Ministry Leader", module: "ministry", action: "update" },
      { role_name: "Ministry Leader", module: "ministry", action: "delete" },
      // Events page - can read and create invites
      { role_name: "Ministry Leader", module: "events", action: "read" },
      { role_name: "Ministry Leader", module: "events", action: "create" },
      // Attendance page - can read for their ministry
      { role_name: "Ministry Leader", module: "attendance", action: "read" },
      // Services page - can read for scheduling
      { role_name: "Ministry Leader", module: "services", action: "read" },
      // Archives page - can read, upload, download
      { role_name: "Ministry Leader", module: "archives", action: "read" },
      { role_name: "Ministry Leader", module: "archives", action: "create" },
      { role_name: "Ministry Leader", module: "archives", action: "update" },
      // Inventory page - can request (read + create)
      { role_name: "Ministry Leader", module: "inventory", action: "read" },
      { role_name: "Ministry Leader", module: "inventory", action: "create" },
      // Dashboard - needed for sidebar access (not a permission module but included for completeness)
      { role_name: "Ministry Leader", module: "dashboard", action: "read" },

      // ── Member ────────────────────────────────────────────────
      { role_name: "Member", module: "members", action: "read" },
      { role_name: "Member", module: "finance", action: "read" },
      { role_name: "Member", module: "events", action: "read" },
      { role_name: "Member", module: "services", action: "read" },
      { role_name: "Member", module: "services", action: "create" },
      { role_name: "Member", module: "archives", action: "read" },
    ];

    const existingRPs = await queryInterface.sequelize.query(
      "SELECT role_id, permission_id FROM role_permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const existingSet = new Set(existingRPs.map(rp => `${rp.role_id}-${rp.permission_id}`));

    const toInsert = [];
    for (const rp of rolePermissions) {
      const role_id = getRoleId(rp.role_name);
      const permission_id = p(rp.module, rp.action);
      if (role_id && permission_id && !existingSet.has(`${role_id}-${permission_id}`)) {
        toInsert.push({ role_id, permission_id, created_at: now });
      }
    }

    if (toInsert.length > 0) {
      await queryInterface.bulkInsert("role_permissions", toInsert);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("role_permissions", null, {});
  },
};