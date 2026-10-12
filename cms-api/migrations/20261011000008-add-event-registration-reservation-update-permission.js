"use strict";

const ensurePermission = async (queryInterface) => {
  await queryInterface.sequelize.query(`
    INSERT INTO permissions (module, action, description, created_at, updated_at)
    SELECT 'event_registrations', 'update', 'Change an event attendee seat or parking reservation', NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM permissions WHERE module = 'event_registrations' AND action = 'update'
    )
  `);
};

module.exports = {
  up: async (queryInterface) => {
    await ensurePermission(queryInterface);
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
      SELECT r.id, p.id, NOW()
      FROM roles r
      JOIN permissions p ON p.module = 'event_registrations' AND p.action = 'update'
      WHERE r.role_name IN ('System Admin', 'Registration Team')
    `);
  },

  down: async () => {
    throw new Error("Event reservation update access is forward-only; do not restore broad event write grants.");
  },
};
