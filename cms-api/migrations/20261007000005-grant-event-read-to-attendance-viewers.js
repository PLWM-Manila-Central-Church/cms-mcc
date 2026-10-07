"use strict";

const EVENT_READERS = ["Pastor", "Registration Team"];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      INSERT INTO permissions (module, action, description, created_at, updated_at)
      SELECT 'events', 'read', 'View events and registration details', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE module = 'events' AND action = 'read'
      )
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at)
      SELECT role.id, permission.id, CURRENT_TIMESTAMP
      FROM roles role
      JOIN permissions permission ON permission.module = 'events' AND permission.action = 'read'
      WHERE role.role_name IN (?, ?)
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions existing
          WHERE existing.role_id = role.id AND existing.permission_id = permission.id
        )
    `, { replacements: EVENT_READERS });
  },

  // Do not remove a read grant on rollback: it may have existed before this
  // repair in a customized production role. Use a forward-only correction.
  down: async () => {
    throw new Error("Event reader grants are forward-only; preserve role access during rollback.");
  },
};
