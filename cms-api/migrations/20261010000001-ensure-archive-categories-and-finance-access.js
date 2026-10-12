"use strict";

const DEFAULT_ARCHIVE_CATEGORIES = Object.freeze([
  { name: "Financial Records", description: "Official financial reports and documents" },
  { name: "Legal Documents", description: "Church legal documents, permits, and registrations" },
  { name: "Meeting Minutes", description: "Minutes from leadership and board meetings" },
  { name: "Sermons", description: "Sermon recordings, notes, and manuscripts" },
  { name: "Event Materials", description: "Event programs, posters, and related materials" },
  { name: "Media", description: "Photos, videos, and other media files" },
  { name: "Member Documents", description: "Member-related documents and forms" },
  { name: "Others", description: "Other miscellaneous documents" },
]);

const FINANCE_ARCHIVE_ACTIONS = ["read", "create"];

module.exports = {
  async up(queryInterface) {
    const roleRows = await queryInterface.sequelize.query(
      "SELECT id FROM roles WHERE role_name = ? LIMIT 1",
      {
        replacements: ["Finance Team"],
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    if (!roleRows.length) throw new Error("Required role not found: Finance Team");

    const permissionRows = await queryInterface.sequelize.query(
      "SELECT id, action FROM permissions WHERE module = ? AND action IN (?, ?)",
      {
        replacements: ["archives", ...FINANCE_ARCHIVE_ACTIONS],
        type: queryInterface.sequelize.QueryTypes.SELECT,
      },
    );
    const permissionsByAction = new Map(permissionRows.map((row) => [row.action, row.id]));
    const missingActions = FINANCE_ARCHIVE_ACTIONS.filter((action) => !permissionsByAction.has(action));
    if (missingActions.length) {
      throw new Error(`Required Finance Team archive permissions not found: ${missingActions.join(", ")}`);
    }

    for (const action of FINANCE_ARCHIVE_ACTIONS) {
      await queryInterface.sequelize.query(
        "INSERT IGNORE INTO role_permissions (role_id, permission_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
        { replacements: [roleRows[0].id, permissionsByAction.get(action)] },
      );
    }

    const existingRows = await queryInterface.sequelize.query(
      "SELECT name FROM archive_categories",
      { type: queryInterface.sequelize.QueryTypes.SELECT },
    );
    const existingNames = new Set(existingRows.map((row) => row.name));
    const now = new Date();
    const missingCategories = DEFAULT_ARCHIVE_CATEGORIES
      .filter((category) => !existingNames.has(category.name))
      .map((category) => ({ ...category, created_at: now, updated_at: now }));

    if (missingCategories.length) {
      await queryInterface.bulkInsert("archive_categories", missingCategories);
    }
  },

  async down() {
    throw new Error(
      "Finance archive access and baseline archive categories are required by the system; use a reviewed forward migration to change this access.",
    );
  },
};
