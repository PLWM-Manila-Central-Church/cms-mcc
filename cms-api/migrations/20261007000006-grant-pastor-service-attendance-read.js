"use strict";

const READ_GRANTS = [
  { module: "services", action: "read", description: "View services" },
  { module: "attendance", action: "read", description: "View attendance records" },
];

module.exports = {
  up: async (queryInterface) => {
    for (const grant of READ_GRANTS) {
      await queryInterface.sequelize.query(`
        INSERT INTO permissions (module, action, description, created_at, updated_at)
        SELECT :module, :action, :description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        WHERE NOT EXISTS (
          SELECT 1 FROM permissions WHERE module = :module AND action = :action
        )
      `, { replacements: grant });

      await queryInterface.sequelize.query(`
        INSERT INTO role_permissions (role_id, permission_id, created_at)
        SELECT role.id, permission.id, CURRENT_TIMESTAMP
        FROM roles role
        JOIN permissions permission
          ON permission.module = :module AND permission.action = :action
        WHERE role.role_name = 'Pastor'
          AND NOT EXISTS (
            SELECT 1 FROM role_permissions existing
            WHERE existing.role_id = role.id
              AND existing.permission_id = permission.id
          )
      `, { replacements: grant });
    }
  },

  // Preserve customized access during rollback; this read grant is forward-only.
  down: async () => {
    throw new Error("Pastor Service and attendance read grants are forward-only.");
  },
};
