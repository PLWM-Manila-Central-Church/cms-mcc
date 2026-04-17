"use strict";

// Adds ministry:read permission to Finance Team so the
// Ministry tab in the mobile bottom nav is accessible for that role.

module.exports = {
  up: async (queryInterface) => {
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

    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );

    let ministryRead = permissions.find(
      (p) => p.module === "ministry" && p.action === "read"
    );

    if (!ministryRead) {
      await queryInterface.bulkInsert("permissions", [{
        module: "ministry",
        action: "read",
        description: "View ministry assignments",
        created_at: now,
        updated_at: now,
      }]);
      const newPerm = await queryInterface.sequelize.query(
        "SELECT id FROM permissions WHERE module = 'ministry' AND action = 'read' LIMIT 1",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (newPerm.length) ministryRead = { id: newPerm[0].id };
    }

    if (!ministryRead) return;

    const financeTeamId = roleMap["Finance Team"];
    if (!financeTeamId) return;

    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :pid LIMIT 1",
      {
        replacements: { role_id: financeTeamId, pid: ministryRead.id },
        type: queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert("role_permissions", [
        { role_id: financeTeamId, permission_id: ministryRead.id, created_at: new Date() },
      ]);
    }
  },

  down: async (queryInterface) => {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const ministryRead = permissions.find(
      (p) => p.module === "ministry" && p.action === "read"
    );

    const roles = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE role_name = 'Finance Team' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (ministryRead && roles.length) {
      await queryInterface.sequelize.query(
        "DELETE FROM role_permissions WHERE role_id = :role_id AND permission_id = :pid",
        { replacements: { role_id: roles[0].id, pid: ministryRead.id } }
      );
    }
  },
};