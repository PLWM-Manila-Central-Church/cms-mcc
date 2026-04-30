"use strict";

const scopedRoleNames = [
  "Ministry Leader",
  "Cell Group Leader",
  "Group Leader",
];

const grants = {
  "Ministry Leader": [
    ["members", "read"],
    ["ministry", "read"],
    ["events", "read"],
    ["events", "invite"],
    ["attendance", "read"],
    ["services", "read"],
    ["archives", "read"],
    ["inventory", "read"],
    ["scope_assignments", "manage"],
  ],
  "Cell Group Leader": [
    ["members", "read"],
    ["cell_groups", "read"],
    ["events", "read"],
    ["attendance", "read"],
    ["attendance", "create"],
    ["attendance", "delete"],
    ["services", "read"],
    ["archives", "read"],
    ["inventory", "read"],
    ["scope_assignments", "manage"],
  ],
  "Group Leader": [
    ["members", "read"],
    ["events", "read"],
    ["attendance", "read"],
    ["services", "read"],
    ["archives", "read"],
    ["inventory", "read"],
    ["scope_assignments", "manage"],
  ],
};

const modulesToReset = [
  "members",
  "ministry",
  "events",
  "attendance",
  "services",
  "archives",
  "inventory",
  "cell_groups",
  "scope_assignments",
];

module.exports = {
  up: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      INSERT INTO permissions (module, action, description, created_at, updated_at)
      SELECT 'events', 'invite', 'Invite ministry members to events', NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE module = 'events' AND action = 'invite'
      )
    `);

    await queryInterface.sequelize.query(`
      INSERT INTO permissions (module, action, description, created_at, updated_at)
      SELECT 'scope_assignments', 'manage', 'Assign and unassign members within a leader scope', NOW(), NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE module = 'scope_assignments' AND action = 'manage'
      )
    `);

    await queryInterface.sequelize.query(`
      DELETE rp
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.role_name IN (${scopedRoleNames.map(() => "?").join(", ")})
        AND p.module IN (${modulesToReset.map(() => "?").join(", ")})
    `, {
      replacements: [...scopedRoleNames, ...modulesToReset],
    });

    for (const [roleName, permissions] of Object.entries(grants)) {
      for (const [module, action] of permissions) {
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
          replacements: [module, action, roleName],
        });
      }
    }
  },

  down: async (queryInterface) => {
    await queryInterface.sequelize.query(`
      DELETE rp
      FROM role_permissions rp
      JOIN roles r ON r.id = rp.role_id
      JOIN permissions p ON p.id = rp.permission_id
      WHERE r.role_name IN (${scopedRoleNames.map(() => "?").join(", ")})
        AND p.module IN (${modulesToReset.map(() => "?").join(", ")})
    `, {
      replacements: [...scopedRoleNames, ...modulesToReset],
    });
  },
};
