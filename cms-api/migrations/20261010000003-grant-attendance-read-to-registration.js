"use strict";

module.exports = {
  async up(queryInterface) {
    const rows = await queryInterface.sequelize.query(
      `SELECT role.id AS role_id, permission.id AS permission_id
       FROM roles role
       JOIN permissions permission
         ON permission.module = 'attendance' AND permission.action = 'read'
       WHERE role.role_name = 'Registration Team'
       LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (!rows.length) {
      throw new Error("Required Registration Team role or attendance:read permission not found");
    }

    await queryInterface.sequelize.query(
      `INSERT INTO role_permissions (role_id, permission_id, created_at)
       SELECT :roleId, :permissionId, CURRENT_TIMESTAMP
       WHERE NOT EXISTS (
         SELECT 1 FROM role_permissions
         WHERE role_id = :roleId AND permission_id = :permissionId
       )`,
      {
        replacements: {
          roleId: rows[0].role_id,
          permissionId: rows[0].permission_id,
        },
      },
    );
  },

  async down() {
    throw new Error(
      "Registration attendance read access is required for event check-in operations; use a reviewed forward migration to change it.",
    );
  },
};
