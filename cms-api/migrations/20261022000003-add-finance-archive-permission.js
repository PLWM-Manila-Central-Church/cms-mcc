"use strict";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      INSERT INTO permissions (module, action, description, created_at, updated_at)
      SELECT 'finance', 'archive', 'Archive finance records for later restoration', NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE module = 'finance' AND action = 'archive'
      )
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at)
      SELECT r.id, p.id, NOW()
      FROM roles r
      JOIN permissions p ON p.module = 'finance' AND p.action = 'archive'
      WHERE r.role_name = 'Finance Team'
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions rp
          WHERE rp.role_id = r.id AND rp.permission_id = p.id
        )
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE rp FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.role_name = 'Finance Team' AND p.module = 'finance' AND p.action = 'archive'
    `);
    await queryInterface.sequelize.query(`
      DELETE p FROM permissions p
      WHERE p.module = 'finance' AND p.action = 'archive'
        AND NOT EXISTS (SELECT 1 FROM role_permissions rp WHERE rp.permission_id = p.id)
    `);
  },
};
