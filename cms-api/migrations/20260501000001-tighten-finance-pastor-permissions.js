"use strict";

const removals = [
  { role: "Finance Team", module: "ministry", actions: ["read"] },
  { role: "Pastor", module: "events", actions: ["create", "update", "delete"] },
];

const insertGrant = async (queryInterface, role, module, action) => {
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
  `, {
    replacements: [module, action, role],
  });
};

module.exports = {
  up: async (queryInterface) => {
    for (const removal of removals) {
      await queryInterface.sequelize.query(`
        DELETE rp
        FROM role_permissions rp
        JOIN roles r ON r.id = rp.role_id
        JOIN permissions p ON p.id = rp.permission_id
        WHERE r.role_name = ?
          AND p.module = ?
          AND p.action IN (${removal.actions.map(() => "?").join(", ")})
      `, {
        replacements: [removal.role, removal.module, ...removal.actions],
      });
    }
  },

  down: async (queryInterface) => {
    await insertGrant(queryInterface, "Finance Team", "ministry", "read");
    await insertGrant(queryInterface, "Pastor", "events", "create");
    await insertGrant(queryInterface, "Pastor", "events", "update");
    await insertGrant(queryInterface, "Pastor", "events", "delete");
  },
};
