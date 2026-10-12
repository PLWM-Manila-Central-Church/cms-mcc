"use strict";

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE rp
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.role_name = 'Pastor'
        AND p.module = 'inventory'
        AND p.action = 'create'
    `);
  },

  down: async () => {
    throw new Error(
      "[20261011000003] Forward-only least-privilege migration; do not restore Pastor's inventory:create grant.",
    );
  },
};
