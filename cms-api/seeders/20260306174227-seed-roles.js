"use strict";

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    const existingRoles = await queryInterface.sequelize.query(
      "SELECT role_name FROM roles",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const existingNames = new Set(existingRoles.map(r => r.role_name));

    const rolesToAdd = [
      {
        role_name: "System Admin",
        description: "Full access to all modules. Can manage users, roles, permissions, and system settings.",
        is_system: 1,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: "Pastor",
        description: "Read access to all modules. Can approve archive documents and view confidential member notes.",
        is_system: 1,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: "Registration Team",
        description: "Manages member profiles, events, archives. Creates user accounts and sends invitations.",
        is_system: 1,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: "Finance Team",
        description: "Creates and updates financial records. Can only access Financial Records archive category.",
        is_system: 1,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: "Cell Group Leader",
        description: "Manages members in their own cell group only. Can view attendance and submit inventory requests.",
        is_system: 1,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: "Group Leader",
        description: "Manages members in their ministry group. Can submit inventory requests.",
        is_system: 1,
        created_at: now,
        updated_at: now,
      },
      {
        role_name: "Member",
        description: "Basic access. Can view own profile, financial records, pre-register for services, and register for events.",
        is_system: 1,
        created_at: now,
        updated_at: now,
      },
    ].filter(r => !existingNames.has(r.role_name));

    if (rolesToAdd.length > 0) {
      await queryInterface.bulkInsert("roles", rolesToAdd);
    }
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete("roles", { is_system: 1 }, {});
  },
};