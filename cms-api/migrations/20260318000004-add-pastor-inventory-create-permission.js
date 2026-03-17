"use strict";
module.exports = {
  up: async (queryInterface) => {
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const invCreate = permissions.find(x => x.module === "inventory" && x.action === "create");
    if (!invCreate) throw new Error("Permission not found: inventory.create");

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
