"use strict";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      INSERT INTO permissions (module, action, description, created_at, updated_at)
      SELECT 'events', 'invite', 'Invite ministry members to events', NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE module = 'events' AND action = 'invite'
      )
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at)
      SELECT r.id, p.id, NOW()
      FROM roles r
      JOIN permissions p ON p.module = 'events' AND p.action = 'invite'
      WHERE r.role_name = 'Ministry Leader'
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);

    await queryInterface.sequelize.query(`
      DELETE rp
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.role_name = 'Ministry Leader'
        AND p.module = 'events'
        AND p.action = 'create'
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE rp
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.role_name = 'Ministry Leader'
        AND p.module = 'events'
        AND p.action = 'invite'
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at)
      SELECT r.id, p.id, NOW()
      FROM roles r
      JOIN permissions p ON p.module = 'events' AND p.action = 'create'
      WHERE r.role_name = 'Ministry Leader'
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);
  },
};
