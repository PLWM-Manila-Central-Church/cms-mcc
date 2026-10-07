"use strict";

const LEADER_ROLE = "Leader";

const showTables = async (queryInterface) => {
  const rows = await queryInterface.showAllTables();
  return new Set(rows.map((row) => String(typeof row === "string" ? row : Object.values(row)[0]).toLowerCase()));
};

const addColumnIfMissing = async (queryInterface, table, column, definition) => {
  const columns = await queryInterface.describeTable(table);
  if (!columns[column]) await queryInterface.addColumn(table, column, definition);
};

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const tables = await showTables(queryInterface);
    for (const required of ["roles", "permissions", "role_permissions", "user_leader_assignments", "users"]) {
      if (!tables.has(required)) throw new Error(`The ${required} table is required before unified Leader support.`);
    }

    // Reuse the existing 3NF assignment store. Existing rows are backfilled
    // and default active; retain their typed scope, actor and legacy-column data.
    await addColumnIfMissing(queryInterface, "user_leader_assignments", "is_active", {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    });
    await addColumnIfMissing(queryInterface, "user_leader_assignments", "version", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    });
    await addColumnIfMissing(queryInterface, "user_leader_assignments", "revoked_by", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "user_leader_assignments", "revoked_at", {
      type: Sequelize.DATE,
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "user_leader_assignments", "revocation_reason", {
      type: Sequelize.STRING(500),
      allowNull: true,
    });
    await addColumnIfMissing(queryInterface, "users", "leadership_revision", {
      type: Sequelize.INTEGER.UNSIGNED,
      allowNull: false,
      defaultValue: 0,
    });

    await queryInterface.sequelize.query(`
      INSERT INTO roles (role_name, description, is_system, created_at, updated_at)
      SELECT ?, 'Assigned cell-group and group leadership scopes', 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (SELECT 1 FROM roles WHERE role_name = ?)
    `, { replacements: [LEADER_ROLE, LEADER_ROLE] });

    await queryInterface.sequelize.query(`
      INSERT INTO permissions (module, action, description, created_at, updated_at)
      SELECT 'leader_assignments', 'manage', 'Grant and revoke user leadership assignments', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      WHERE NOT EXISTS (
        SELECT 1 FROM permissions WHERE module = 'leader_assignments' AND action = 'manage'
      )
    `);

    // Leader receives the intersection of old profile grants. Authorization
    // checks a selected assignment against its matching legacy permission
    // profile so the group role cannot inherit cell-group-only access.
    await queryInterface.sequelize.query(`
      INSERT INTO role_permissions (role_id, permission_id, created_at)
      SELECT leader.id, permission.id, CURRENT_TIMESTAMP
      FROM roles leader
      JOIN permissions permission
      WHERE leader.role_name = ?
        AND EXISTS (
          SELECT 1 FROM role_permissions cell_grant
          JOIN roles cell_role ON cell_role.id = cell_grant.role_id
          WHERE cell_role.role_name = 'Cell Group Leader'
            AND cell_grant.permission_id = permission.id
        )
        AND EXISTS (
          SELECT 1 FROM role_permissions group_grant
          JOIN roles group_role ON group_role.id = group_grant.role_id
          WHERE group_role.role_name = 'Group Leader'
            AND group_grant.permission_id = permission.id
        )
        AND NOT EXISTS (
          SELECT 1 FROM role_permissions existing_grant
          WHERE existing_grant.role_id = leader.id AND existing_grant.permission_id = permission.id
        )
    `, { replacements: [LEADER_ROLE] });
  },

  down: async (queryInterface) => {
    const [leaderUsers] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM users WHERE role_id IN (SELECT id FROM roles WHERE role_name = 'Leader')",
    );
    if (Number(leaderUsers[0]?.count || 0) > 0) {
      throw new Error("Cannot undo unified Leader support while Leader accounts exist; deploy a dual-aware forward rollback.");
    }

    const [assignmentHistory] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS count FROM user_leader_assignments WHERE is_active = 0 OR version > 1 OR revoked_at IS NOT NULL",
    );
    if (Number(assignmentHistory[0]?.count || 0) > 0) {
      throw new Error("Cannot remove recorded leader-assignment history; preserve it and use a compatible forward fix.");
    }

    await queryInterface.sequelize.query(`
      DELETE grant_row
      FROM role_permissions grant_row
      JOIN roles leader ON leader.id = grant_row.role_id
      WHERE leader.role_name = ?
    `, { replacements: [LEADER_ROLE] });
    await queryInterface.sequelize.query("DELETE FROM roles WHERE role_name = ?", { replacements: [LEADER_ROLE] });

    const [managePermission] = await queryInterface.sequelize.query(
      "SELECT id FROM permissions WHERE module = 'leader_assignments' AND action = 'manage' LIMIT 1",
    );
    if (managePermission[0]?.id) {
      await queryInterface.sequelize.query(
        "DELETE FROM permissions WHERE id = ? AND NOT EXISTS (SELECT 1 FROM role_permissions WHERE permission_id = ?)",
        { replacements: [managePermission[0].id, managePermission[0].id] },
      );
    }

    for (const [table, column] of [
      ["users", "leadership_revision"],
      ["user_leader_assignments", "revocation_reason"],
      ["user_leader_assignments", "revoked_at"],
      ["user_leader_assignments", "revoked_by"],
      ["user_leader_assignments", "version"],
      ["user_leader_assignments", "is_active"],
    ]) {
      const tables = await showTables(queryInterface);
      if (!tables.has(table)) continue;
      const columns = await queryInterface.describeTable(table);
      if (columns[column]) await queryInterface.removeColumn(table, column);
    }
  },
};
