"use strict";

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
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    let invCreate = permissions.find(x => x.module === "inventory" && x.action === "create");

    if (!invCreate) {
      const existingPerms = await queryInterface.sequelize.query(
        "SELECT module, action FROM permissions",
        { type: queryInterface.sequelize.QueryTypes.SELECT },
      );
      const existingSet = new Set(existingPerms.map(p => `${p.module}.${p.action}`));

      if (!existingSet.has("inventory.create")) {
        await queryInterface.bulkInsert("permissions", [{
          module: "inventory",
          action: "create",
          description: "Add inventory items",
          created_at: now,
          updated_at: now,
        }]);
      }

      const newPerm = await queryInterface.sequelize.query(
        "SELECT id FROM permissions WHERE module = 'inventory' AND action = 'create' LIMIT 1",
        { type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (newPerm.length) invCreate = { id: newPerm[0].id };
    }

    if (!invCreate) return;

    const roles = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE role_name = 'Pastor' LIMIT 1`,
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    if (!roles.length) return;
    const pastorId = roles[0].id;

    const exists = await queryInterface.sequelize.query(
      "SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ? LIMIT 1",
      {
        replacements: [pastorId, invCreate.id],
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    if (!exists.length) {
      await queryInterface.bulkInsert("role_permissions", [{
        role_id: pastorId,
        permission_id: invCreate.id,
        created_at: new Date(),
      }]);
    }
  },
  down: async () => {},
};