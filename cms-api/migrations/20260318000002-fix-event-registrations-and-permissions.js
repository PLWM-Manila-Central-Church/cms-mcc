"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // ── Add registered_by to event_registrations ──────────────
    await queryInterface.addColumn("event_registrations", "registered_by", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: "users", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      after: "registered_at",
    });

    // ── Fix permissions ───────────────────────────────────────
    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );

    const p = (module, action) => {
      const found = permissions.find(
        (perm) => perm.module === module && perm.action === action,
      );
      if (!found) throw new Error(`Permission not found: ${module}.${action}`);
      return found.id;
    };

    const safeInsert = async (role_id, permission_id) => {
      const existing = await queryInterface.sequelize.query(
        "SELECT id FROM role_permissions WHERE role_id = :role_id AND permission_id = :permission_id LIMIT 1",
        {
          replacements: { role_id, permission_id },
          type: queryInterface.sequelize.QueryTypes.SELECT,
        },
      );
      if (existing.length === 0) {
        await queryInterface.bulkInsert("role_permissions", [
          { role_id, permission_id, created_at: new Date() },
        ]);
      }
    };

    // Role 3 (Registration Team): needs events.delete to remove registrations
    await safeInsert(3, p("events", "delete"));

    // Role 7 (Member): needs events.delete to self-unregister
    await safeInsert(7, p("events", "delete"));
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn("event_registrations", "registered_by");

    const permissions = await queryInterface.sequelize.query(
      "SELECT id, module, action FROM permissions",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const p = (module, action) => {
      const found = permissions.find(
        (perm) => perm.module === module && perm.action === action,
      );
      return found ? found.id : null;
    };

    for (const { role_id, module, action } of [
      { role_id: 3, module: "events", action: "delete" },
      { role_id: 7, module: "events", action: "delete" },
    ]) {
      const permission_id = p(module, action);
      if (permission_id) {
        await queryInterface.sequelize.query(
          "DELETE FROM role_permissions WHERE role_id = :role_id AND permission_id = :permission_id",
          { replacements: { role_id, permission_id } },
        );
      }
    }
  },
};
