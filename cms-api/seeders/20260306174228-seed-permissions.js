"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const existingPerms = await queryInterface.sequelize.query(
      "SELECT module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const existingSet = new Set(existingPerms.map(p => `${p.module}.${p.action}`));

    const permsToAdd = [
      // ── Members ────────────────────────────────────────────
      { module: "members", action: "read", description: "View member profiles", created_at: now, updated_at: now },
      { module: "members", action: "create", description: "Create new member profiles", created_at: now, updated_at: now },
      { module: "members", action: "update", description: "Edit member profiles", created_at: now, updated_at: now },
      { module: "members", action: "delete", description: "Soft-delete member profiles", created_at: now, updated_at: now },
      // ── Users ──────────────────────────────────────────────
      { module: "users", action: "read", description: "View user accounts", created_at: now, updated_at: now },
      { module: "users", action: "create", description: "Create user accounts", created_at: now, updated_at: now },
      { module: "users", action: "update", description: "Edit user accounts", created_at: now, updated_at: now },
      { module: "users", action: "delete", description: "Deactivate user accounts", created_at: now, updated_at: now },
      // ── Roles ──────────────────────────────────────────────
      { module: "roles", action: "read", description: "View roles", created_at: now, updated_at: now },
      { module: "roles", action: "create", description: "Create roles", created_at: now, updated_at: now },
      { module: "roles", action: "update", description: "Edit roles", created_at: now, updated_at: now },
      { module: "roles", action: "delete", description: "Delete roles", created_at: now, updated_at: now },
      // ── Attendance ─────────────────────────────────────────
      { module: "attendance", action: "read", description: "View attendance records", created_at: now, updated_at: now },
      { module: "attendance", action: "create", description: "Record check-ins", created_at: now, updated_at: now },
      { module: "attendance", action: "update", description: "Edit attendance records", created_at: now, updated_at: now },
      { module: "attendance", action: "delete", description: "Delete attendance records", created_at: now, updated_at: now },
      // ── Services ───────────────────────────────────────────
      { module: "services", action: "read", description: "View services", created_at: now, updated_at: now },
      { module: "services", action: "create", description: "Create services", created_at: now, updated_at: now },
      { module: "services", action: "update", description: "Edit services", created_at: now, updated_at: now },
      { module: "services", action: "delete", description: "Delete services", created_at: now, updated_at: now },
      // ── Finance ────────────────────────────────────────────
      { module: "finance", action: "read", description: "View financial records", created_at: now, updated_at: now },
      { module: "finance", action: "create", description: "Create financial records", created_at: now, updated_at: now },
      { module: "finance", action: "update", description: "Edit financial records", created_at: now, updated_at: now },
      { module: "finance", action: "delete", description: "Delete financial records", created_at: now, updated_at: now },
      // ── Events ──────────────────────────────────────────────
      { module: "events", action: "read", description: "View events", created_at: now, updated_at: now },
      { module: "events", action: "create", description: "Create events", created_at: now, updated_at: now },
      { module: "events", action: "update", description: "Edit events", created_at: now, updated_at: now },
      { module: "events", action: "delete", description: "Delete events", created_at: now, updated_at: now },
      // ── Inventory ──────────────────────────────────────────
      { module: "inventory", action: "read", description: "View inventory", created_at: now, updated_at: now },
      { module: "inventory", action: "create", description: "Add inventory items", created_at: now, updated_at: now },
      { module: "inventory", action: "update", description: "Edit inventory items", created_at: now, updated_at: now },
      { module: "inventory", action: "delete", description: "Delete inventory items", created_at: now, updated_at: now },
      // ── Archives ───────────────────────────────────────────
      { module: "archives", action: "read", description: "View archive documents", created_at: now, updated_at: now },
      { module: "archives", action: "create", description: "Upload archive documents", created_at: now, updated_at: now },
      { module: "archives", action: "update", description: "Edit/approve archive docs", created_at: now, updated_at: now },
      { module: "archives", action: "delete", description: "Delete archive documents", created_at: now, updated_at: now },
      // ── Ministry ───────────────────────────────────────────
      { module: "ministry", action: "read", description: "View ministry assignments", created_at: now, updated_at: now },
      { module: "ministry", action: "create", description: "Create ministry assignments", created_at: now, updated_at: now },
      { module: "ministry", action: "update", description: "Edit ministry assignments", created_at: now, updated_at: now },
      { module: "ministry", action: "delete", description: "Delete ministry assignments", created_at: now, updated_at: now },
      // ── Cell Groups ────────────────────────────────────────
      { module: "cell_groups", action: "read", description: "View cell groups", created_at: now, updated_at: now },
      { module: "cell_groups", action: "create", description: "Create cell groups", created_at: now, updated_at: now },
      { module: "cell_groups", action: "update", description: "Edit cell groups", created_at: now, updated_at: now },
      { module: "cell_groups", action: "delete", description: "Delete cell groups", created_at: now, updated_at: now },
      // ── Notifications ──────────────────────────────────────
      { module: "notifications", action: "read", description: "View notifications", created_at: now, updated_at: now },
      { module: "notifications", action: "create", description: "Create notifications", created_at: now, updated_at: now },
      { module: "notifications", action: "update", description: "Edit notifications", created_at: now, updated_at: now },
      { module: "notifications", action: "delete", description: "Delete notifications", created_at: now, updated_at: now },
      // ── Settings ───────────────────────────────────────────
      { module: "settings", action: "read", description: "View system settings", created_at: now, updated_at: now },
      { module: "settings", action: "create", description: "Create system settings", created_at: now, updated_at: now },
      { module: "settings", action: "update", description: "Modify system settings", created_at: now, updated_at: now },
      { module: "settings", action: "delete", description: "Delete system settings", created_at: now, updated_at: now },
      // ── Audit ──────────────────────────────────────────────
      { module: "audit", action: "read", description: "View audit logs", created_at: now, updated_at: now },
    ].filter(p => !existingSet.has(`${p.module}.${p.action}`));

    if (permsToAdd.length > 0) {
      await queryInterface.bulkInsert("permissions", permsToAdd);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("permissions", null, {});
  },
};
