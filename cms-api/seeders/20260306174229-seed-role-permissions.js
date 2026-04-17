"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Dynamically fetch all permissions from DB
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    // Helper: get permission_id by module + action
    const p = (module, action) => {
      const found = permissions.find(
        (perm) => perm.module === module && perm.action === action,
      );
      if (!found) throw new Error(`Permission not found: ${module}.${action}`);
      return found.id;
    };

    // Role IDs: 1=System Admin, 2=Pastor, 3=Registration Team,
    //           4=Finance Team, 5=Cell Group Leader, 6=Group Leader, 7=Member

    const rolePermissions = [
      // ── System Admin — all permissions ──────────────────────
      // members
      { role_id: 1, permission_id: p("members", "read"), created_at: now },
      { role_id: 1, permission_id: p("members", "create"), created_at: now },
      { role_id: 1, permission_id: p("members", "update"), created_at: now },
      { role_id: 1, permission_id: p("members", "delete"), created_at: now },
      // users
      { role_id: 1, permission_id: p("users", "read"), created_at: now },
      { role_id: 1, permission_id: p("users", "create"), created_at: now },
      { role_id: 1, permission_id: p("users", "update"), created_at: now },
      { role_id: 1, permission_id: p("users", "delete"), created_at: now },
      // roles
      { role_id: 1, permission_id: p("roles", "read"), created_at: now },
      { role_id: 1, permission_id: p("roles", "create"), created_at: now },
      { role_id: 1, permission_id: p("roles", "update"), created_at: now },
      { role_id: 1, permission_id: p("roles", "delete"), created_at: now },
      // attendance
      { role_id: 1, permission_id: p("attendance", "read"), created_at: now },
      { role_id: 1, permission_id: p("attendance", "create"), created_at: now },
      { role_id: 1, permission_id: p("attendance", "update"), created_at: now },
      { role_id: 1, permission_id: p("attendance", "delete"), created_at: now },
      // services
      { role_id: 1, permission_id: p("services", "read"), created_at: now },
      { role_id: 1, permission_id: p("services", "create"), created_at: now },
      { role_id: 1, permission_id: p("services", "update"), created_at: now },
      { role_id: 1, permission_id: p("services", "delete"), created_at: now },
      // finance
      { role_id: 1, permission_id: p("finance", "read"), created_at: now },
      { role_id: 1, permission_id: p("finance", "create"), created_at: now },
      { role_id: 1, permission_id: p("finance", "update"), created_at: now },
      { role_id: 1, permission_id: p("finance", "delete"), created_at: now },
      // events
      { role_id: 1, permission_id: p("events", "read"), created_at: now },
      { role_id: 1, permission_id: p("events", "create"), created_at: now },
      { role_id: 1, permission_id: p("events", "update"), created_at: now },
      { role_id: 1, permission_id: p("events", "delete"), created_at: now },
      // inventory
      { role_id: 1, permission_id: p("inventory", "read"), created_at: now },
      { role_id: 1, permission_id: p("inventory", "create"), created_at: now },
      { role_id: 1, permission_id: p("inventory", "update"), created_at: now },
      { role_id: 1, permission_id: p("inventory", "delete"), created_at: now },
      // archives
      { role_id: 1, permission_id: p("archives", "read"), created_at: now },
      { role_id: 1, permission_id: p("archives", "create"), created_at: now },
      { role_id: 1, permission_id: p("archives", "update"), created_at: now },
      { role_id: 1, permission_id: p("archives", "delete"), created_at: now },
      // ministry
      { role_id: 1, permission_id: p("ministry", "read"), created_at: now },
      { role_id: 1, permission_id: p("ministry", "create"), created_at: now },
      { role_id: 1, permission_id: p("ministry", "update"), created_at: now },
      { role_id: 1, permission_id: p("ministry", "delete"), created_at: now },
      // cellgroups
      { role_id: 1, permission_id: p("cellgroups", "read"), created_at: now },
      { role_id: 1, permission_id: p("cellgroups", "create"), created_at: now },
      { role_id: 1, permission_id: p("cellgroups", "update"), created_at: now },
      { role_id: 1, permission_id: p("cellgroups", "delete"), created_at: now },
      // notifications
      {
        role_id: 1,
        permission_id: p("notifications", "read"),
        created_at: now,
      },
      {
        role_id: 1,
        permission_id: p("notifications", "create"),
        created_at: now,
      },
      {
        role_id: 1,
        permission_id: p("notifications", "update"),
        created_at: now,
      },
      {
        role_id: 1,
        permission_id: p("notifications", "delete"),
        created_at: now,
      },
      // settings
      { role_id: 1, permission_id: p("settings", "read"), created_at: now },
      { role_id: 1, permission_id: p("settings", "create"), created_at: now },
      { role_id: 1, permission_id: p("settings", "update"), created_at: now },
      { role_id: 1, permission_id: p("settings", "delete"), created_at: now },
      // audit
      { role_id: 1, permission_id: p("audit", "read"), created_at: now },

      // ── Pastor — read everything + approve archives ──────────
      { role_id: 2, permission_id: p("members", "read"), created_at: now },
      { role_id: 2, permission_id: p("attendance", "read"), created_at: now },
      { role_id: 2, permission_id: p("finance", "read"), created_at: now },
      { role_id: 2, permission_id: p("events", "read"), created_at: now },
      { role_id: 2, permission_id: p("services", "read"), created_at: now },
      { role_id: 2, permission_id: p("inventory", "read"), created_at: now },
      { role_id: 2, permission_id: p("archives", "read"), created_at: now },
      { role_id: 2, permission_id: p("archives", "update"), created_at: now },
      { role_id: 2, permission_id: p("ministry", "read"), created_at: now },
      { role_id: 2, permission_id: p("cellgroups", "read"), created_at: now },
      { role_id: 2, permission_id: p("audit", "read"), created_at: now },

      // ── Registration Team ────────────────────────────────────
      { role_id: 3, permission_id: p("members", "read"), created_at: now },
      { role_id: 3, permission_id: p("members", "create"), created_at: now },
      { role_id: 3, permission_id: p("members", "update"), created_at: now },
      { role_id: 3, permission_id: p("users", "read"), created_at: now },
      { role_id: 3, permission_id: p("users", "create"), created_at: now },
      { role_id: 3, permission_id: p("users", "update"), created_at: now },
      { role_id: 3, permission_id: p("attendance", "read"), created_at: now },
      { role_id: 3, permission_id: p("attendance", "create"), created_at: now },
      { role_id: 3, permission_id: p("events", "read"), created_at: now },
      { role_id: 3, permission_id: p("events", "create"), created_at: now },
      { role_id: 3, permission_id: p("events", "update"), created_at: now },
      { role_id: 3, permission_id: p("services", "read"), created_at: now },
      { role_id: 3, permission_id: p("services", "create"), created_at: now },
      { role_id: 3, permission_id: p("inventory", "read"), created_at: now },
      { role_id: 3, permission_id: p("archives", "read"), created_at: now },
      { role_id: 3, permission_id: p("archives", "create"), created_at: now },
      { role_id: 3, permission_id: p("cellgroups", "read"), created_at: now },
      { role_id: 3, permission_id: p("ministry", "read"), created_at: now },
      { role_id: 3, permission_id: p("ministry", "create"), created_at: now },

      // ── Finance Team ─────────────────────────────────────────
      { role_id: 4, permission_id: p("members", "read"), created_at: now },
      { role_id: 4, permission_id: p("finance", "read"), created_at: now },
      { role_id: 4, permission_id: p("finance", "create"), created_at: now },
      { role_id: 4, permission_id: p("finance", "update"), created_at: now },
      { role_id: 4, permission_id: p("archives", "read"), created_at: now },

      // ── Cell Group Leader ─────────────────────────────────────
      { role_id: 5, permission_id: p("members", "read"), created_at: now },
      { role_id: 5, permission_id: p("members", "update"), created_at: now },
      { role_id: 5, permission_id: p("attendance", "read"), created_at: now },
      { role_id: 5, permission_id: p("events", "read"), created_at: now },
      { role_id: 5, permission_id: p("services", "read"), created_at: now },
      { role_id: 5, permission_id: p("inventory", "read"), created_at: now },
      { role_id: 5, permission_id: p("inventory", "create"), created_at: now },
      { role_id: 5, permission_id: p("archives", "read"), created_at: now },
      { role_id: 5, permission_id: p("cellgroups", "read"), created_at: now },
      { role_id: 5, permission_id: p("ministry", "read"), created_at: now },

      // ── Group Leader ──────────────────────────────────────────
      { role_id: 6, permission_id: p("members", "read"), created_at: now },
      { role_id: 6, permission_id: p("members", "update"), created_at: now },
      { role_id: 6, permission_id: p("attendance", "read"), created_at: now },
      { role_id: 6, permission_id: p("events", "read"), created_at: now },
      { role_id: 6, permission_id: p("services", "read"), created_at: now },
      { role_id: 6, permission_id: p("inventory", "read"), created_at: now },
      { role_id: 6, permission_id: p("inventory", "create"), created_at: now },
      { role_id: 6, permission_id: p("archives", "read"), created_at: now },
      { role_id: 6, permission_id: p("ministry", "read"), created_at: now },

      // ── Ministry Leader ─────────────────────────────────────────
      { role_id: 8, permission_id: p("ministry", "read"), created_at: now },
      { role_id: 8, permission_id: p("ministry", "create"), created_at: now },
      { role_id: 8, permission_id: p("ministry", "update"), created_at: now },
      { role_id: 8, permission_id: p("ministry", "delete"), created_at: now },
      { role_id: 8, permission_id: p("events", "read"), created_at: now },
      { role_id: 8, permission_id: p("attendance", "read"), created_at: now },
      { role_id: 8, permission_id: p("services", "read"), created_at: now },
      { role_id: 8, permission_id: p("archives", "read"), created_at: now },
      { role_id: 8, permission_id: p("cellgroups", "read"), created_at: now },
      { role_id: 8, permission_id: p("inventory", "read"), created_at: now },

      // ── Member ────────────────────────────────────────────────
      { role_id: 7, permission_id: p("members", "read"), created_at: now },
      { role_id: 7, permission_id: p("finance", "read"), created_at: now },
      { role_id: 7, permission_id: p("events", "read"), created_at: now },
      { role_id: 7, permission_id: p("services", "read"), created_at: now },
      { role_id: 7, permission_id: p("services", "create"), created_at: now }, // pre-registration + substitute requests
      { role_id: 7, permission_id: p("archives", "read"), created_at: now },
    ];

    await queryInterface.bulkInsert("role_permissions", rolePermissions);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("role_permissions", null, {});
  },
};
