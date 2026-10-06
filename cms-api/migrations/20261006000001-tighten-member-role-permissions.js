"use strict";

const dashboardRoles = [
  "System Admin",
  "Pastor",
  "Registration Team",
  "Finance Team",
  "Cell Group Leader",
  "Group Leader",
  "Ministry Leader",
];

const memberGrantsToRemove = [
  ["members", ["read"]],
  ["dashboard", ["read"]],
  ["finance", ["read"]],
  ["events", ["read", "create", "delete"]],
  ["services", ["read", "create"]],
  ["archives", ["read"]],
];

const insertGrant = async (queryInterface, roleName, module, action) => {
  await queryInterface.sequelize.query(`
    INSERT INTO role_permissions (role_id, permission_id, created_at)
    SELECT r.id, p.id, NOW()
    FROM roles r
    JOIN permissions p ON p.module = ? AND p.action = ?
    WHERE r.role_name = ?
      AND NOT EXISTS (
        SELECT 1 FROM role_permissions rp
        WHERE rp.role_id = r.id AND rp.permission_id = p.id
      )
  `, { replacements: [module, action, roleName] });
};

const dashboardInsert = async (queryInterface) => {
  await queryInterface.sequelize.query(`
    INSERT INTO permissions (module, action, description, created_at, updated_at)
    SELECT 'dashboard', 'read', 'View role-scoped dashboard statistics', NOW(), NOW()
    WHERE NOT EXISTS (
      SELECT 1 FROM permissions WHERE module = 'dashboard' AND action = 'read'
    )
  `);
};

const removeMemberGrants = async (queryInterface) => {
  const clauses = memberGrantsToRemove.map(([module, actions]) =>
    `(p.module = ? AND p.action IN (${actions.map(() => "?").join(", ")}))`,
  );
  const replacements = ["Member"];
  for (const [module, actions] of memberGrantsToRemove) replacements.push(module, ...actions);

  await queryInterface.sequelize.query(`
    DELETE rp
    FROM role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    JOIN permissions p ON p.id = rp.permission_id
    WHERE r.role_name = ?
      AND (${clauses.join(" OR ")})
  `, { replacements });
};

module.exports = {
  up: async (queryInterface) => {
    await dashboardInsert(queryInterface);

    for (const roleName of dashboardRoles) {
      await insertGrant(queryInterface, roleName, "dashboard", "read");
    }

    await removeMemberGrants(queryInterface);
  },

  down: async (queryInterface) => {
    // Restore the pre-migration grants if an operator explicitly rolls back.
    for (const [module, actions] of memberGrantsToRemove) {
      for (const action of actions) {
        await insertGrant(queryInterface, "Member", module, action);
      }
    }

    await queryInterface.sequelize.query(`
      DELETE rp
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.role_name IN (${dashboardRoles.map(() => "?").join(", ")})
        AND p.module = 'dashboard'
        AND p.action = 'read'
    `, { replacements: dashboardRoles });
  },
};
