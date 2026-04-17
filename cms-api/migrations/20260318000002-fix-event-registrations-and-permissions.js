"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn("event_registrations", "registered_by", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "registered_at",
    });

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

    const existingPerms = await queryInterface.sequelize.query(
      "SELECT module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const existingSet = new Set(existingPerms.map(p => `${p.module}.${p.action}`));

    const permsToAdd = [
      { module: "events", action: "delete", description: "Delete events", created_at: now, updated_at: now },
    ].filter(p => !existingSet.has(`${p.module}.${p.action}`));

    if (permsToAdd.length > 0) {
      await queryInterface.bulkInsert("permissions", permsToAdd);
    }

    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    const p = (module, action) => {
      const found = permissions.find(perm => perm.module === module && perm.action === action);
      if (!found) throw new Error(`Permission not found: ${module}.${action}`);
      return found.id;
    };

    const safeInsert = async (role_name, permission_id) => {
      const role_id = roleMap[role_name];
      if (!role_id) return;
      const existing = await queryInterface.sequelize.query(
        "SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :permission_id LIMIT 1",
        { replacements: { role_id, permission_id }, type: queryInterface.sequelize.QueryTypes.SELECT }
      );
      if (existing.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          { role_id, permission_id, created_at: new Date() },
        ]);
      }
    };

    await safeInsert("Registration Team", p("events", "delete"));
    await safeInsert("Member", p("events", "delete"));
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("event_registrations", "registered_by");

    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const p = (module, action) => {
      const found = permissions.find(perm => perm.module === module && perm.action === action);
      return found ? found.id : null;
    };

    const roles = await queryInterface.sequelize.query(
      "SELECT id, role_name FROM roles",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const roleMap = {};
    roles.forEach(r => roleMap[r.role_name] = r.id);

    for (const { role_name, module, action } of [
      { role_name: "Registration Team", module: "events", action: "delete" },
      { role_name: "Member", module: "events", action: "delete" },
    ]) {
      const role_id = roleMap[role_name];
      const permission_id = p(module, action);
      if (role_id && permission_id) {
        await queryInterface.sequelize.query(
          "DELETE FROM role_permissions WHERE role_id = :role_id AND permission_id = :permission_id",
          { replacements: { role_id, permission_id } },
        );
      }
    }
  },
};