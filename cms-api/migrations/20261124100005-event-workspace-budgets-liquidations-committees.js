"use strict";

const tableExists = async (queryInterface, name) => {
  const tables = await queryInterface.showAllTables();
  const names = tables.map((t) => (typeof t === "string" ? t : t.tableName || Object.values(t)[0]));
  return names.some((n) => String(n).toLowerCase() === name.toLowerCase());
};

const addColIfMissing = async (queryInterface, table, colName, def) => {
  const desc = await queryInterface.describeTable(table);
  if (!desc[colName]) {
    await queryInterface.addColumn(table, colName, def);
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Enrich events
    await addColIfMissing(queryInterface, "events", "organizer_ministry_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "events", "coordinator_user_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "events", "expected_participants", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "events", "end_time", { type: Sequelize.TIME, allowNull: true });
    await addColIfMissing(queryInterface, "events", "program_notes", { type: Sequelize.TEXT, allowNull: true });
    await addColIfMissing(queryInterface, "events", "lifecycle_status", {
      type: Sequelize.ENUM("draft", "pending_approval", "approved", "published", "ongoing", "completed", "liquidated", "closed", "cancelled"),
      allowNull: false,
      defaultValue: "published",
    });

    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    };

    if (!(await tableExists(queryInterface, "event_committees"))) {
      await queryInterface.createTable("event_committees", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        name: { type: Sequelize.STRING(120), allowNull: false },
        chair_member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        responsibilities: { type: Sequelize.TEXT, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("event_committees", ["event_id"], { name: "idx_event_committees_event" });
    }

    if (!(await tableExists(queryInterface, "event_assignments"))) {
      await queryInterface.createTable("event_assignments", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        committee_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        role_title: { type: Sequelize.STRING(120), allowNull: false },
        task_notes: { type: Sequelize.TEXT, allowNull: true },
        status: { type: Sequelize.ENUM("assigned", "confirmed", "completed", "cancelled"), allowNull: false, defaultValue: "assigned" },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("event_assignments", ["event_id"], { name: "idx_event_assignments_event" });
    }

    if (!(await tableExists(queryInterface, "event_program_items"))) {
      await queryInterface.createTable("event_program_items", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        sort_order: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        start_time: { type: Sequelize.TIME, allowNull: true },
        end_time: { type: Sequelize.TIME, allowNull: true },
        title: { type: Sequelize.STRING(180), allowNull: false },
        lead_person: { type: Sequelize.STRING(120), allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("event_program_items", ["event_id"], { name: "idx_event_program_event" });
    }

    if (!(await tableExists(queryInterface, "event_budgets"))) {
      await queryInterface.createTable("event_budgets", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        title: { type: Sequelize.STRING(160), allowNull: false },
        total_requested: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        total_approved: { type: Sequelize.DECIMAL(14, 2), allowNull: true },
        fund_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        status: { type: Sequelize.ENUM("draft", "submitted", "approved", "rejected", "revised"), allowNull: false, defaultValue: "draft" },
        submitted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        approved_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        approved_at: { type: Sequelize.DATE, allowNull: true },
        rejection_reason: { type: Sequelize.TEXT, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("event_budgets", ["event_id"], { name: "idx_event_budgets_event" });
    }

    if (!(await tableExists(queryInterface, "event_budget_items"))) {
      await queryInterface.createTable("event_budget_items", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        budget_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        category_name: { type: Sequelize.STRING(100), allowNull: false },
        description: { type: Sequelize.STRING(255), allowNull: true },
        quantity: { type: Sequelize.DECIMAL(10, 2), allowNull: false, defaultValue: 1 },
        unit_cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        estimated_amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("event_budget_items", ["budget_id"], { name: "idx_event_budget_items_budget" });
    }

    if (!(await tableExists(queryInterface, "event_cash_advances"))) {
      await queryInterface.createTable("event_cash_advances", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        budget_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        recipient_member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        recipient_name: { type: Sequelize.STRING(150), allowNull: false },
        amount_released: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        release_date: { type: Sequelize.DATEONLY, allowNull: true },
        account_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        fund_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        reference_number: { type: Sequelize.STRING(100), allowNull: true },
        status: { type: Sequelize.ENUM("requested", "approved", "released", "liquidated", "cancelled"), allowNull: false, defaultValue: "requested" },
        released_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        released_at: { type: Sequelize.DATE, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("event_cash_advances", ["event_id"], { name: "idx_event_cash_advances_event" });
    }

    if (!(await tableExists(queryInterface, "event_liquidations"))) {
      await queryInterface.createTable("event_liquidations", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        cash_advance_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        total_advanced: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        total_spent: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        amount_returned: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        amount_reimbursed: { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 },
        status: { type: Sequelize.ENUM("draft", "submitted", "verified", "posted", "rejected"), allowNull: false, defaultValue: "draft" },
        submitted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        verified_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        verified_at: { type: Sequelize.DATE, allowNull: true },
        posted_at: { type: Sequelize.DATE, allowNull: true },
        rejection_reason: { type: Sequelize.TEXT, allowNull: true },
        notes: { type: Sequelize.TEXT, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("event_liquidations", ["event_id"], { name: "idx_event_liquidations_event" });
    }

    if (!(await tableExists(queryInterface, "event_liquidation_items"))) {
      await queryInterface.createTable("event_liquidation_items", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        liquidation_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        expense_category_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        expense_date: { type: Sequelize.DATEONLY, allowNull: false },
        vendor: { type: Sequelize.STRING(150), allowNull: true },
        description: { type: Sequelize.STRING(255), allowNull: false },
        receipt_number: { type: Sequelize.STRING(100), allowNull: true },
        amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        posted_expense_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("event_liquidation_items", ["liquidation_id"], { name: "idx_event_liq_items_liq" });
    }

    if (!(await tableExists(queryInterface, "event_approvals"))) {
      await queryInterface.createTable("event_approvals", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        entity_type: { type: Sequelize.ENUM("event", "budget", "cash_advance", "liquidation"), allowNull: false },
        entity_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        action: { type: Sequelize.STRING(40), allowNull: false },
        actor_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("event_approvals", ["event_id"], { name: "idx_event_approvals_event" });
    }
  },

  async down(queryInterface) {
    for (const t of [
      "event_approvals", "event_liquidation_items", "event_liquidations",
      "event_cash_advances", "event_budget_items", "event_budgets",
      "event_program_items", "event_assignments", "event_committees",
    ]) {
      if (await tableExists(queryInterface, t)) await queryInterface.dropTable(t);
    }
  },
};
