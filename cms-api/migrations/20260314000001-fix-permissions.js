"use strict";

// ── Fix 1: Add services:create permission to Member role (role_id: 7)
//   Enables: pre-registration for services + substitute request submission
//
// ── Fix 2: The substitute request POST route now uses services:create
//   instead of ministry:create, so Member no longer accidentally gets
//   access to create ministry roles/assignments.
//
// ── Fix 3: users:deactivate and inventory:manage were phantom permissions
//   that never existed in the permissions table — fixed in routes only,
//   no DB change needed for those.

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get the services:create permission id
    const [permissions] = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE module = 'services' AND action = 'create' LIMIT 1`
    );

    if (!permissions.length) {
      throw new Error("services:create permission not found in permissions table.");
    }

    const permissionId = permissions[0].id;

    // Check if Member role (role_id: 7) already has services:create
    const [existing] = await queryInterface.sequelize.query(
      `SELECT id FROM role_permissions WHERE role_id = 7 AND permission_id = ${permissionId} LIMIT 1`
    );

    if (existing.length) {
      console.log("Member already has services:create — skipping.");
      return;
    }

    await queryInterface.bulkInsert("role_permissions", [
      {
        role_id: 7,
        permission_id: permissionId,
        created_at: new Date(),
      },
    ]);

    console.log("✓ Added services:create to Member role.");
  },

  down: async (queryInterface) => {
    const [permissions] = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE module = 'services' AND action = 'create' LIMIT 1`
    );

    if (!permissions.length) return;

    await queryInterface.bulkDelete("role_permissions", {
      role_id: 7,
      permission_id: permissions[0].id,
    });
  },
};
