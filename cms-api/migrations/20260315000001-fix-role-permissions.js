"use strict";

module.exports = {
  up: async (queryInterface) => {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    const p = (module, action) => {
      const found = permissions.find(
        (perm) => perm.module === module && perm.action === action,
      );
      if (!found) throw new Error(`Permission not found: ${module}.${action}`);
      return found.id;
    };

    // Helper: insert only if not already present
    const safeInsert = async (role_id, permission_id) => {
      const existing = await queryInterface.sequelize.query(
        "SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :permission_id LIMIT 1",
        {
          replacements: { role_id, permission_id },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (existing.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          { role_id, permission_id, created_at: new Date() },
        ]);
      }
    };

    // Role 7 (Member): needs events.create to register for events
    await safeInsert(7, p("events", "create"));

    // Role 3 (Registration Team): needs ministry.update to edit assignments
    await safeInsert(3, p("ministry", "update"));

    // Role 5 (Cell Group Leader): needs inventory.update to approve/reject requests
    await safeInsert(5, p("inventory", "update"));

    // Role 6 (Group Leader): needs inventory.update to approve/reject requests
    await safeInsert(6, p("inventory", "update"));
  },

  down: async (queryInterface) => {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    const p = (module, action) => {
      const found = permissions.find(
        (perm) => perm.module === module && perm.action === action,
      );
      return found ? found.id : null;
    };

    const removals = [
      { role_id: 7, permission_id: p("events",    "create") },
      { role_id: 3, permission_id: p("ministry",  "update") },
      { role_id: 5, permission_id: p("inventory", "update") },
      { role_id: 6, permission_id: p("inventory", "update") },
    ].filter(r => r.permission_id !== null);

    for (const { role_id, permission_id } of removals) {
      await queryInterface.sequelize.query(
        "DELETE FROM role_permissions WHERE role_id = :role_id AND permission_id = :permission_id",
        { replacements: { role_id, permission_id } },
      );
    }
  },
};
