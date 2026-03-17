"use strict";
module.exports = {
  up: async (queryInterface) => {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const p = (module, action) => {
      const found = permissions.find(x => x.module === module && x.action === action);
      if (!found) throw new Error(`Permission not found: ${module}.${action}`);
      return found.id;
    };

    const targetRoles = await queryInterface.sequelize.query(
      `SELECT id, role_name FROM roles WHERE role_name IN ('Member','Pastor','Group Leader','Cell Group Leader')`,
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    const now = new Date();
    const rowsToInsert = [];

    for (const role of targetRoles) {
      for (const action of ["create", "delete"]) {
        const exists = await queryInterface.sequelize.query(
          "SELECT id FROM role_permissions WHERE role_id = ? AND permission_id = ? LIMIT 1",
          {
            replacements: [role.id, p("events", action)],
            type: queryInterface.sequelize.QueryTypes.SELECT,
          },
        );
        if (!exists.length) {
          rowsToInsert.push({
            role_id: role.id,
            permission_id: p("events", action),
            created_at: now,
          });
        }
      }
    }

    if (rowsToInsert.length > 0) {
      await queryInterface.bulkInsert("role_permissions", rowsToInsert);
    }
  },
  down: async () => {},
};
