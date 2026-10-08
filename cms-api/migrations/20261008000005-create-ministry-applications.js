"use strict";

const permissions = [
  ["ministry_applications", "apply", "Submit a ministry application"],
  ["ministry_applications", "read", "Read ministry applications"],
  ["ministry_applications", "review", "Approve or reject ministry applications"],
];

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable("ministry_applications", {
      id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
      application_key: { type: Sequelize.STRING(100), allowNull: true, unique: true },
      member_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "members", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      ministry_role_id: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        references: { model: "ministry_roles", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "RESTRICT",
      },
      status: { type: Sequelize.ENUM("pending", "approved", "rejected", "withdrawn"), allowNull: false, defaultValue: "pending" },
      message: { type: Sequelize.TEXT, allowNull: true },
      review_note: { type: Sequelize.TEXT, allowNull: true },
      reviewed_by: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
        references: { model: "users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      },
      reviewed_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex("ministry_applications", ["member_id", "status"], { name: "idx_ministry_app_member_status" });
    await queryInterface.addIndex("ministry_applications", ["ministry_role_id", "status"], { name: "idx_ministry_app_role_status" });

    for (const [module, action, description] of permissions) {
      await queryInterface.sequelize.query(
        `INSERT INTO permissions (module, action, description, created_at, updated_at)
         VALUES (:module, :action, :description, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
         ON DUPLICATE KEY UPDATE description = VALUES(description)`,
        { replacements: { module, action, description } },
      );
    }

    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
      SELECT r.id, p.id, CURRENT_TIMESTAMP
      FROM roles r JOIN permissions p
      WHERE (r.role_name = 'Member' AND p.module = 'ministry_applications' AND p.action IN ('apply', 'read'))
         OR (r.role_name = 'Ministry Leader' AND p.module = 'ministry_applications' AND p.action IN ('read', 'review'))
    `);
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE rp FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.module = 'ministry_applications'
    `);
    await queryInterface.sequelize.query("DELETE FROM permissions WHERE module = 'ministry_applications'");
    await queryInterface.dropTable("ministry_applications");
  },
};
