"use strict";

const ROLE_NAME = "Finance Team";
const MODULE_NAME = "finance";
const REQUIRED_ACTIONS = ["read", "create", "update"];

module.exports = {
  async up(queryInterface) {
    const roleRows = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE role_name = ? LIMIT 1",
      {
        replacements: [ROLE_NAME],
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    if (!roleRows.length) throw new Error(`Required role not found: ${ROLE_NAME}`);
    const roleId = roleRows[0].id;

    const permissionRows = await queryInterface.sequelize.query(
      "SELECT id, action FROM permissions WHERE module = ? AND action IN (?, ?, ?)",
      {
        replacements: [MODULE_NAME, ...REQUIRED_ACTIONS],
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    const permissionsByAction = new Map(permissionRows.map((row) => [row.action, row.id]));
    const missing = REQUIRED_ACTIONS.filter((action) => !permissionsByAction.has(action));
    if (missing.length) {
      throw new Error(`Required Finance Team permissions not found: ${missing.join(", ")}`);
    }

    for (const action of REQUIRED_ACTIONS) {
      await queryInterface.sequelize.query(
        "INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        { replacements: [roleId, permissionsByAction.get(action)] },
      );
    }
  },

  async down() {
    throw new Error(
      "Finance Team core permissions are required by the system; use a reviewed forward migration to change this access.",
    );
  },
};
