"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DELETE rp FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.role_name <> 'System Admin' AND p.module = 'users'
    `);
  },
  async down() {
    throw new Error("Forward-only security migration: do not restore non-admin account management");
  },
};
