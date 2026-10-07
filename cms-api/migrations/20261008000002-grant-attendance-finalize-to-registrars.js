"use strict";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      INSERT INTO permissions (module, action, description, created_at, updated_at)
      SELECT 'qr_attendance', 'finalize', 'Finalize reconciled attendance sessions', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE module = 'qr_attendance' AND action = 'finalize'
      )
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at)
      SELECT role.id, permission.id, CURRENT_TIMESTAMP
      FROM roles role
      JOIN permissions permission
        ON permission.module = 'qr_attendance' AND permission.action = 'finalize'
      WHERE role.role_name IN ('System Admin', 'Registration Team')
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions existing
          WHERE existing.role_id = role.id AND existing.permission_id = permission.id
        )
    `);
  },

  // Review and reconciliation privileges are forward-only; preserve customized access.
  down: async () => {
    throw new Error("Attendance finalization grants are forward-only.");
  },
};
