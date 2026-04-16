"use strict";

// Grants ministry:delete to Registration Team.
// Required so Ministry Leaders (Reg Team users with ministry_role_id set)
// can remove members from the ministry roster via the UI.

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

    const ministryDelete = permissions.find(
      (p) => p.module === "ministry" && p.action === "delete"
    );
    if (!ministryDelete) {
      throw new Error("Permission ministry:delete not found. Run base seeders first.");
    }

    const regTeamId = roleMap["Registration Team"];
    if (!regTeamId) return;

    const existing = await queryInterface.sequelize.query(
      "SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :pid LIMIT 1",
      {
        replacements: { role_id: regTeamId, pid: ministryDelete.id },
        type:         queryInterface.sequelize.QueryTypes.SELECT,
      }
    );

    if (existing.length === 0) {
      await queryInterface.bulkInsert("role_permissions", [
        { role_id: regTeamId, permission_id: ministryDelete.id, created_at: new Date() },
      ]);
    }
  },

  down: async (queryInterface) => {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT }
    );
    const ministryDelete = permissions.find(
      (p) => p.module === "ministry" && p.action === "delete"
    );

    const roles = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE role_name = 'Registration Team' LIMIT 1",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    if (ministryDelete && roles.length) {
      await queryInterface.sequelize.query(
        "DELETE FROM role_permissions WHERE role_id = :role_id AND permission_id = :pid",
        { replacements: { role_id: roles[0].id, pid: ministryDelete.id } }
      );
    }
  },
};