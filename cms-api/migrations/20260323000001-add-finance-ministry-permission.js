"use strict";

// Adds ministry:read permission to Finance Team (role_id 4) so the
// Ministry tab in the mobile bottom nav is accessible for that role.
module.exports = {
  up: async (queryInterface) => {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const ministryRead = permissions.find(
      (p) => p.module === "ministry" && p.action === "read"
    );
    if (!ministryRead) {
      throw new Error("Permission ministry:read not found. Run base seeders first.");
    }

    // Only insert if not already present (idempotent)
    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM role_permissions WHERE role_id = 4 AND permission_id = :pid LIMIT 1",
      {
        replacements: { pid: ministryRead.id },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert("role_permissions", [
        { role_id: 4, permission_id: ministryRead.id, created_at: new Date() },
      ]);
    }
  },

  down: async (queryInterface) => {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const ministryRead = permissions.find(
      (p) => p.module === "ministry" && p.action === "read"
    );
    if (ministryRead) {
      await queryInterface.sequelize.query(
        "DELETE FROM role_permissions WHERE role_id = 4 AND permission_id = :pid",
        { replacements: { pid: ministryRead.id } }
      );
    }
  },
};
