"use strict";

// Replaces the old instrument-style ministry roles (seeded by
// 20260306174237-seed-ministry-roles.js) with 15 org-level roles
// that reflect the actual ministry structure of the church.
//
// SAFE: uses TRUNCATE only if no ministry_memberships or
// ministry_assignments reference the existing rows. If references
// exist, the migration aborts with a clear error rather than
// corrupting data.

const NEW_ROLES = [
  "Choir",
  "Church School Teachers",
  "Facility Maintenance Team",
  "Deaf Ministry",
  "Women's Group Leaders",
  "Men's Group Leaders",
  "YA Group Leaders",
  "Finance Ministry",
  "Registration Team",
  "Media Team",
  "Parking and Marshal",
  "Usher Team",
  "Broadcasting Ministry",
];

module.exports = {
  up: async (queryInterface) => {
    const now = new Date();

    // Guard: abort if any ministry_memberships or ministry_assignments already
    // reference the current rows — prevents silent FK violations.
    const [memberships] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS cnt FROM ministry_memberships"
    );
    const [assignments] = await queryInterface.sequelize.query(
      "SELECT COUNT(*) AS cnt FROM ministry_assignments"
    );

    const memCount  = parseInt(memberships[0]?.cnt  || 0);
    const asnCount  = parseInt(assignments[0]?.cnt  || 0);

    if (memCount > 0 || asnCount > 0) {
      throw new Error(
        `[20260324000005] Cannot replace ministry roles: ` +
        `${memCount} ministry_membership(s) and ${asnCount} ministry_assignment(s) ` +
        `still reference existing roles. Remove or re-assign them first.`
      );
    }

    // Safe to truncate — no references exist
    await queryInterface.sequelize.query(
      "SET FOREIGN_KEY_CHECKS = 0"
    );
    await queryInterface.bulkDelete("ministry_roles", null, {});
    await queryInterface.sequelize.query(
      "SET FOREIGN_KEY_CHECKS = 1"
    );

    await queryInterface.bulkInsert(
      "ministry_roles",
      NEW_ROLES.map((name) => ({ name, created_at: now, updated_at: now }))
    );
  },

  down: async (queryInterface) => {
    const now = new Date();
    // Rolls back to the pre-batch instrument-style seed roles.
    const OLD_ROLES = [
      "Worship","Media & Livestream","Ushering & Hospitality","Prayer & Intercession",
      "Kids Church","Youth Ministry","Cell Group Ministry","Evangelism & Outreach",
      "Finance & Stewardship","Archives & Documentation","Events & Logistics",
      "Security & Parking","Music & Arts","Social Media & Communications","Others",
    ];

    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
    await queryInterface.bulkDelete("ministry_roles", null, {});
    await queryInterface.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");

    await queryInterface.bulkInsert(
      "ministry_roles",
      OLD_ROLES.map((name) => ({ name, created_at: now, updated_at: now }))
    );
  },
};
