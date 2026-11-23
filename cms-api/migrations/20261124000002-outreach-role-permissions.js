"use strict";

const READ_ROLES = ["Pastor", "Registration Team", "Ministry Leader", "Cell Group Leader", "Group Leader"];
const MANAGE_ROLES = ["Registration Team"];

const ensurePermission = async (queryInterface, module, action) => {
  let [rows] = await queryInterface.sequelize.query(
    `SELECT id FROM permissions WHERE module = :module AND action = :action LIMIT 1`,
    { replacements: { module, action } },
  );
  if (!rows.length) {
    await queryInterface.bulkInsert("permissions", [{
      module, action, created_at: new Date(), updated_at: new Date(),
    }]);
    [rows] = await queryInterface.sequelize.query(
      `SELECT id FROM permissions WHERE module = :module AND action = :action LIMIT 1`,
      { replacements: { module, action } },
    );
  }
  return rows[0].id;
};

const grant = async (queryInterface, roleName, permissionId) => {
  const [roles] = await queryInterface.sequelize.query(
    `SELECT id FROM roles WHERE role_name = :roleName LIMIT 1`,
    { replacements: { roleName } },
  );
  if (!roles.length) return;
  const [existing] = await queryInterface.sequelize.query(
    `SELECT id FROM role_permissions WHERE role_id = :roleId AND permission_id = :permissionId LIMIT 1`,
    { replacements: { roleId: roles[0].id, permissionId } },
  );
  if (existing.length) return;
  await queryInterface.bulkInsert("role_permissions", [{
    role_id: roles[0].id, permission_id: permissionId, created_at: new Date(),
  }]);
};

module.exports = {
  async up(queryInterface) {
    const readPermission = await ensurePermission(queryInterface, "outreach", "read");
    for (const roleName of READ_ROLES) await grant(queryInterface, roleName, readPermission);
    const managePermission = await ensurePermission(queryInterface, "outreach", "manage");
    for (const roleName of MANAGE_ROLES) await grant(queryInterface, roleName, managePermission);
  },

  async down(queryInterface) {
    for (const action of ["read", "manage"]) {
      const [permissions] = await queryInterface.sequelize.query(
        `SELECT id FROM permissions WHERE module = 'outreach' AND action = :action LIMIT 1`,
        { replacements: { action } },
      );
      if (!permissions.length) continue;
      const roles = action === "read" ? READ_ROLES : MANAGE_ROLES;
      for (const roleName of roles) {
        const [roleRows] = await queryInterface.sequelize.query(
          `SELECT id FROM roles WHERE role_name = :roleName LIMIT 1`,
          { replacements: { roleName } },
        );
        if (!roleRows.length) continue;
        await queryInterface.bulkDelete("role_permissions", {
          role_id: roleRows[0].id, permission_id: permissions[0].id,
        });
      }
    }
  },
};
