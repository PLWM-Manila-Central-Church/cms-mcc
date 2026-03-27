"use strict";

// Grants ministry:delete to Registration Team (role_id 3).
// Required so Ministry Leaders (Reg Team users with ministry_role_id set)
// can remove members from the ministry roster via the UI.

module.exports = {
  up: async (queryInterface) => {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    const ministryDelete = permissions.find(
      (p) => p.module === "ministry" && p.action === "delete"
    );
    if (!ministryDelete) {
      throw new Error("Permission ministry:delete not found. Run base seeders first.");
    }

    // Idempotent — only insert if the row does not already exist
    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM role_permissions WHERE role_id = 3 AND permission_id = :pid LIMIT 1",
      {
        replacements: { pid: ministryDelete.id },
        type:         queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert("role_permissions", [
        { role_id: 3, permission_id: ministryDelete.id, created_at: new Date() },
      ]);
    }
  },

  down: async (queryInterface) => {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const ministryDelete = permissions.find(
      (p) => p.module === "ministry" && p.action === "delete"
    );
    if (ministryDelete) {
      await queryInterface.sequelize.query(
        "DELETE FROM role_permissions WHERE role_id = 3 AND permission_id = :pid",
        { replacements: { pid: ministryDelete.id } }
      );
    }
  },
};
