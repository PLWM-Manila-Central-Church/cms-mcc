"use strict";

const ROLE_GRANTS = Object.freeze({
  "Pastor": ["read", "update"],
  "Registration Team": ["read", "create"],
  "Ministry Leader": ["read", "create", "update"],
});
const REQUIRED_ROLE_NAMES = ["Pastor", "Registration Team"];

module.exports = {
  async up(queryInterface) {
    const roleNames = Object.keys(ROLE_GRANTS);
    const roleRows = await queryInterface.sequelize.query(
      `SELECT id, role_name FROM roles WHERE role_name IN (${roleNames.map(() => "?").join(", ")})`,
      {
        replacements: roleNames,
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    const rolesByName = new Map(roleRows.map((row) => [row.role_name, row.id]));
    const missingRoles = REQUIRED_ROLE_NAMES.filter((roleName) => !rolesByName.has(roleName));
    if (missingRoles.length) {
      throw new Error(`Required archive roles not found: ${missingRoles.join(", ")}`);
    }

    const permissionRows = await queryInterface.sequelize.query(
      "SELECT id, action FROM permissions WHERE module = ? AND action IN (?, ?, ?)",
      {
        replacements: ["archives", "read", "create", "update"],
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    const permissionsByAction = new Map(permissionRows.map((row) => [row.action, row.id]));
    const requiredActions = [...new Set(Object.values(ROLE_GRANTS).flat())];
    const missingActions = requiredActions.filter((action) => !permissionsByAction.has(action));
    if (missingActions.length) {
      throw new Error(`Required archive permissions not found: ${missingActions.join(", ")}`);
    }

    for (const [roleName, actions] of Object.entries(ROLE_GRANTS)) {
      const roleId = rolesByName.get(roleName);
      if (!roleId) continue;
      for (const action of actions) {
        await queryInterface.sequelize.query(
          "INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
          { replacements: [roleId, permissionsByAction.get(action)] },
        );
      }
    }
  },

  async down() {
    throw new Error(
      "Core archive role access is required by the system; use a reviewed forward migration to change this access.",
    );
  },
};
