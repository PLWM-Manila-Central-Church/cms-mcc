"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ── 1. Change member status ENUM ──────────────────────────
    // MySQL requires modifying the column to change ENUM values.
    // We first convert any 'Visitor' rows to 'New', then alter the column.
    await queryInterface.sequelize.query(
      `UPDATE members SET status = 'New' WHERE status = 'Visitor'`
    );
    await queryInterface.changeColumn("members", "status", {
      type: Sequelize.ENUM("New", "Active", "Semi-Active", "Inactive"),
      allowNull: false,
      defaultValue: "Active",
    });

    // ── 2. Add attendance:create for Cell Group Leader (role_id 5) ─
    // Use a subquery to avoid LAST_INSERT_ID() unreliability on Railway.
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
      SELECT 5, id, NOW() FROM permissions
      WHERE module = 'attendance' AND action = 'create'
    `);

    // ── 3. Add attendance:create for Group Leader (role_id 6) ─────
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
      SELECT 6, id, NOW() FROM permissions
      WHERE module = 'attendance' AND action = 'create'
    `);

    // ── 4. Add events:create for Cell Group Leader (role_id 5) ────
    // Needed so they can register attendance at events
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
      SELECT 5, id, NOW() FROM permissions
      WHERE module = 'events' AND action = 'create'
    `);

    // ── 5. Add events:create for Group Leader (role_id 6) ─────────
    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
      SELECT 6, id, NOW() FROM permissions
      WHERE module = 'events' AND action = 'create'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Revert ENUM
    await queryInterface.sequelize.query(
      `UPDATE members SET status = 'Visitor' WHERE status = 'New'`
    );
    await queryInterface.changeColumn("members", "status", {
      type: Sequelize.ENUM("Active", "Inactive", "Visitor"),
      allowNull: false,
      defaultValue: "Active",
    });

    // Remove added permissions
    await queryInterface.sequelize.query(`
      DELETE rp FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id IN (5, 6)
        AND p.module IN ('attendance', 'events')
        AND p.action = 'create'
    `);
  },
};
