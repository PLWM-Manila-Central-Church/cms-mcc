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
    // 1. Enrich funds
    await addColIfMissing(queryInterface, "funds", "fund_code", { type: Sequelize.STRING(32), allowNull: true });
    await addColIfMissing(queryInterface, "funds", "is_restricted", { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 });
    await addColIfMissing(queryInterface, "funds", "opening_balance", { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 });
    await addColIfMissing(queryInterface, "funds", "is_active", { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 });

    // 2. Decouple accounts.fund_id (nullable) & enrich accounts
    const accDesc = await queryInterface.describeTable("accounts");
    if (accDesc.fund_id && !accDesc.fund_id.allowNull) {
      await queryInterface.changeColumn("accounts", "fund_id", {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: true,
      }).catch(() => {});
    }
    await addColIfMissing(queryInterface, "accounts", "account_type", {
      type: Sequelize.ENUM("cash", "petty_cash", "bank", "gcash", "other"),
      allowNull: false,
      defaultValue: "cash",
    });
    await addColIfMissing(queryInterface, "accounts", "account_number_masked", { type: Sequelize.STRING(60), allowNull: true });
    await addColIfMissing(queryInterface, "accounts", "opening_balance", { type: Sequelize.DECIMAL(14, 2), allowNull: false, defaultValue: 0 });
    await addColIfMissing(queryInterface, "accounts", "is_active", { type: Sequelize.TINYINT, allowNull: false, defaultValue: 1 });

    // 3. Enrich financial_records (income)
    await addColIfMissing(queryInterface, "financial_records", "transaction_number", { type: Sequelize.STRING(40), allowNull: true });
    await addColIfMissing(queryInterface, "financial_records", "fund_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "financial_records", "account_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "financial_records", "event_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "financial_records", "ministry_group_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "financial_records", "received_by_name", { type: Sequelize.STRING(120), allowNull: true });
    await addColIfMissing(queryInterface, "financial_records", "approval_status", {
      type: Sequelize.ENUM("posted", "pending", "voided"),
      allowNull: false,
      defaultValue: "posted",
    });

    // 4. Enrich expenses with approval workflow (legacy rows default to 'paid')
    await addColIfMissing(queryInterface, "expenses", "transaction_number", { type: Sequelize.STRING(40), allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "fund_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "payee", { type: Sequelize.STRING(160), allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "requested_by", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "approved_by", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "approved_at", { type: Sequelize.DATE, allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "paid_by", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "paid_at", { type: Sequelize.DATE, allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "payment_reference", { type: Sequelize.STRING(120), allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "event_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "ministry_group_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "liquidation_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "status", {
      type: Sequelize.ENUM("draft", "pending_approval", "approved", "rejected", "paid", "cancelled"),
      allowNull: false,
      defaultValue: "paid",
    });
    await addColIfMissing(queryInterface, "expenses", "rejection_reason", { type: Sequelize.TEXT, allowNull: true });
    await addColIfMissing(queryInterface, "expenses", "remarks", { type: Sequelize.TEXT, allowNull: true });

    // 5. finance_transfers (internal movements excluded from income/expenses)
    if (!(await tableExists(queryInterface, "finance_transfers"))) {
      await queryInterface.createTable("finance_transfers", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        transaction_number: { type: Sequelize.STRING(40), allowNull: true },
        transfer_date: { type: Sequelize.DATEONLY, allowNull: false },
        amount: { type: Sequelize.DECIMAL(14, 2), allowNull: false },
        from_account_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        to_account_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        from_fund_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        to_fund_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        reference_number: { type: Sequelize.STRING(100), allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        deleted_at: { type: Sequelize.DATE, allowNull: true },
        deleted_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("finance_transfers", ["transfer_date"], { name: "idx_finance_transfers_date" });
    }

    // 6. finance_approvals audit trail
    if (!(await tableExists(queryInterface, "finance_approvals"))) {
      await queryInterface.createTable("finance_approvals", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        entity_type: {
          type: Sequelize.ENUM("expense", "budget", "liquidation", "transfer"),
          allowNull: false,
        },
        entity_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        action: {
          type: Sequelize.ENUM("submitted", "approved", "rejected", "paid", "cancelled"),
          allowNull: false,
        },
        actor_user_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        remarks: { type: Sequelize.TEXT, allowNull: true },
        created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      });
      await queryInterface.addIndex("finance_approvals", ["entity_type", "entity_id"], { name: "idx_finance_approvals_entity" });
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, "finance_approvals")) await queryInterface.dropTable("finance_approvals");
    if (await tableExists(queryInterface, "finance_transfers")) await queryInterface.dropTable("finance_transfers");
  },
};
