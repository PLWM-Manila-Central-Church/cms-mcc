"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    const existingRoles = await queryInterface.sequelize.query(
      "SELECT id, role_name FROM roles",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const roleMap = {};
    existingRoles.forEach(r => roleMap[r.role_name] = r.id);

    const rolesToAdd = [
      { role_name: "System Admin", description: "Full access to all modules", is_system: 1 },
      { role_name: "Pastor", description: "Read access to all modules", is_system: 1 },
      { role_name: "Registration Team", description: "Manages member profiles, events, archives", is_system: 1 },
      { role_name: "Finance Team", description: "Creates and updates financial records", is_system: 1 },
      { role_name: "Cell Group Leader", description: "Manages members in their own cell group", is_system: 1 },
      { role_name: "Group Leader", description: "Manages members in their ministry group", is_system: 1 },
      { role_name: "Member", description: "Basic access", is_system: 1 },
    ];

    for (const role of rolesToAdd) {
      if (!roleMap[role.role_name]) {
        await queryInterface.bulkInsert("roles", [{
          ...role,
          created_at: now,
          updated_at: now,
        }]);
        const newRole = await queryInterface.sequelize.query(
          "SELECT id FROM roles WHERE role_name = :role_name LIMIT 1",
          { replacements: { role_name: role.role_name }, type: queryInterface.sequelize.QueryTypes.SELECT }
        );
        if (newRole.length) roleMap[role.role_name] = newRole[0].id;
      }
    }

    // ── 1. Change member status ENUM ──────────────────────────
    await queryInterface.sequelize.query(
      `UPDATE members SET status = 'New' WHERE status = 'Visitor'`
    );
    await queryInterface.changeColumn("members", "status", {
      type: Sequelize.ENUM("New", "Active", "Semi-Active", "Inactive"),
      allowNull: false,
      defaultValue: "Active",
    });

    // ── 2. Add attendance:create for Cell Group Leader ───────
    if (roleMap["Cell Group Leader"]) {
      await queryInterface.sequelize.query(`
        INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
        SELECT ${roleMap["Cell Group Leader"]}, id, NOW() FROM permissions
        WHERE module = 'attendance' AND action = 'create'
      `);
    }

    // ── 3. Add attendance:create for Group Leader ──────────────
    if (roleMap["Group Leader"]) {
      await queryInterface.sequelize.query(`
        INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
        SELECT ${roleMap["Group Leader"]}, id, NOW() FROM permissions
        WHERE module = 'attendance' AND action = 'create'
      `);
    }

    // ── 4. Add events:create for Cell Group Leader ────────────
    if (roleMap["Cell Group Leader"]) {
      await queryInterface.sequelize.query(`
        INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
        SELECT ${roleMap["Cell Group Leader"]}, id, NOW() FROM permissions
        WHERE module = 'events' AND action = 'create'
      `);
    }

    // ── 5. Add events:create for Group Leader ─────────────────
    if (roleMap["Group Leader"]) {
      await queryInterface.sequelize.query(`
        INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
        SELECT ${roleMap["Group Leader"]}, id, NOW() FROM permissions
        WHERE module = 'events' AND action = 'create'
      `);
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      `UPDATE members SET status = 'Visitor' WHERE status = 'New'`
    );
    await queryInterface.changeColumn("members", "status", {
      type: Sequelize.ENUM("Active", "Inactive", "Visitor"),
      allowNull: false,
      defaultValue: "Active",
    });

    const roles = await queryInterface.sequelize.query(
      "SELECT id, role_name FROM roles",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const roleIds = roles
      .filter(r => r.role_name === "Cell Group Leader" || r.role_name === "Group Leader")
      .map(r => r.id);

    if (roleIds.length > 0) {
      await queryInterface.sequelize.query(`
        DELETE rp FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id IN (${roleIds.join(",")})
          AND p.module IN ('attendance', 'events')
          AND p.action = 'create'
      `);
    }
  },
};