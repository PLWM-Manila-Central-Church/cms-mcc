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
  // Check if roles table has data yet (fresh install = seeders haven't run)
  const [roles] = await queryInterface.sequelize.query(
    `SELECT id FROM roles WHERE role_name = 'Member' LIMIT 1`
  );

  if (!roles.length) {
    console.log("Roles not seeded yet — skipping fix-permissions migration.");
    return;
  }

  const roleId = roles[0].id;

  // Get or create services:create permission
  let [permissions] = await queryInterface.sequelize.query(
    `SELECT id FROM permissions WHERE module = 'services' AND action = 'create' LIMIT 1`
  );

  if (!permissions.length) {
    await queryInterface.bulkInsert("permissions", [{
      module: "services",
      action: "create",
      created_at: new Date(),
      updated_at: new Date(),
    }]);
    [permissions] = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE module = 'services' AND action = 'create' LIMIT 1`
    );
  }

  const permissionId = permissions[0].id;

  const [existing] = await queryInterface.sequelize.query(
    `SELECT id FROM role_permissions WHERE role_id = ${roleId} AND permission_id = ${permissionId} LIMIT 1`
  );

  if (existing.length) {
    console.log("Member already has services:create — skipping.");
    return;
  }

  await queryInterface.bulkInsert("role_permissions", [{
    role_id: roleId,
    permission_id: permissionId,
    created_at: new Date(),
  }]);

  console.log("✔ Added services:create to Member role.");
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
