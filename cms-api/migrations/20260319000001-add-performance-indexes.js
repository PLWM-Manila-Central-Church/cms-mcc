"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // ── members ───────────────────────────────────────────────
    // Speeds up paginated list (ORDER BY last_name, first_name)
    // and search queries that always filter is_deleted = 0 first.
    await queryInterface.addIndex("members", ["is_deleted", "last_name", "first_name"], {
      name: "idx_members_search",
      ifNotExists: true,
    });

    // ── financial_records ─────────────────────────────────────
    // Speeds up date-range filters used in finance list + dashboard sum.
    await queryInterface.addIndex("financial_records", ["is_deleted", "transaction_date"], {
      name: "idx_finance_date",
      ifNotExists: true,
    });

    // ── notifications ─────────────────────────────────────────
    // Speeds up per-user unread notifications fetch on every page load.
    await queryInterface.addIndex("notifications", ["user_id", "is_read"], {
      name: "idx_notif_user_read",
      ifNotExists: true,
    });

    // ── audit_logs ────────────────────────────────────────────
    // Speeds up the dashboard recent activity query (ORDER BY created_at DESC).
    await queryInterface.addIndex("audit_logs", ["created_at"], {
      name: "idx_audit_created",
      ifNotExists: true,
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex("members",           "idx_members_search").catch(() => {});
    await queryInterface.removeIndex("financial_records", "idx_finance_date").catch(() => {});
    await queryInterface.removeIndex("notifications",     "idx_notif_user_read").catch(() => {});
    await queryInterface.removeIndex("audit_logs",        "idx_audit_created").catch(() => {});
  },
};
