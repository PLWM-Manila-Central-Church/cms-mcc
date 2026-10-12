"use strict";

const ensurePermission = async (queryInterface, action, description) => {
  await queryInterface.sequelize.query(
    `INSERT INTO permissions (module, action, description, created_at, updated_at)
     SELECT 'event_registrations', :action, :description, NOW(), NOW()
     WHERE NOT EXISTS (
       SELECT 1 FROM permissions WHERE module = 'event_registrations' AND action = :action
     )`,
    { replacements: { action, description } },
  );
};

module.exports = {
  up: async (queryInterface) => {
    await ensurePermission(queryInterface, "create", "Register or manage event attendees");
    await ensurePermission(queryInterface, "delete", "Remove an event attendee registration");

    await queryInterface.sequelize.query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at)
      SELECT r.id, p.id, NOW()
      FROM roles r
      JOIN permissions p ON p.module = 'event_registrations' AND p.action IN ('create', 'delete')
      WHERE r.role_name = 'Registration Team'
    `);

    // Registration Team may manage attendees, but not event records or ministry structures.
    // Ministry leadership is represented by the separate scoped Ministry Leader role.
    await queryInterface.sequelize.query(`
      DELETE rp
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.role_name = 'Registration Team'
        AND (
          (p.module = 'events' AND p.action IN ('create', 'update', 'delete'))
          OR (p.module = 'ministry' AND p.action IN ('create', 'update', 'delete'))
        )
    `);

    // Member self-registration and cancellation remain on the session-scoped Member Portal API.
    await queryInterface.sequelize.query(`
      DELETE rp
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.role_name = 'Member'
        AND p.module = 'events'
        AND p.action IN ('create', 'update', 'delete')
    `);

  },

  down: async () => {
    throw new Error(
      "[20261011000002] Forward-only security migration; do not restore broad event/ministry write grants.",
    );
  },
};
