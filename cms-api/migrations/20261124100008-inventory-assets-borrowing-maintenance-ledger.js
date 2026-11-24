"use strict";

const tableExists = async (queryInterface, name) => {
  const tables = await queryInterface.showAllTables();
  const names = tables.map((t) => (typeof t === "string" ? t : t.tableName || Object.values(t)[0]));
  return names.some((n) => String(n).toLowerCase() === name.toLowerCase());
};

const addColIfMissing = async (queryInterface, table, colName, def) => {
  if (!(await tableExists(queryInterface, table))) return;
  const desc = await queryInterface.describeTable(table);
  if (!desc[colName]) {
    await queryInterface.addColumn(table, colName, def);
  }
};

module.exports = {
  async up(queryInterface, Sequelize) {
    const ts = {
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
    };

    // 1. Enrich inventory_items (Assets vs Consumables)
    await addColIfMissing(queryInterface, "inventory_items", "item_code", { type: Sequelize.STRING(40), allowNull: true });
    await addColIfMissing(queryInterface, "inventory_items", "item_type", {
      type: Sequelize.ENUM("reusable_asset", "consumable"),
      allowNull: false,
      defaultValue: "reusable_asset",
    });
    await addColIfMissing(queryInterface, "inventory_items", "location", { type: Sequelize.STRING(160), allowNull: true });
    await addColIfMissing(queryInterface, "inventory_items", "acquisition_date", { type: Sequelize.DATEONLY, allowNull: true });
    await addColIfMissing(queryInterface, "inventory_items", "unit_cost", { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 });
    await addColIfMissing(queryInterface, "inventory_items", "supplier", { type: Sequelize.STRING(150), allowNull: true });
    await addColIfMissing(queryInterface, "inventory_items", "custodian_user_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "inventory_items", "asset_qr_code", { type: Sequelize.STRING(100), allowNull: true });
    await addColIfMissing(queryInterface, "inventory_items", "reserved_quantity", { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 });

    // 2. Enrich inventory_transactions (Authoritative stock ledger)
    await addColIfMissing(queryInterface, "inventory_transactions", "unit_cost", { type: Sequelize.DECIMAL(12, 2), allowNull: true });
    await addColIfMissing(queryInterface, "inventory_transactions", "supplier", { type: Sequelize.STRING(150), allowNull: true });
    await addColIfMissing(queryInterface, "inventory_transactions", "reference_doc_key", { type: Sequelize.STRING(120), allowNull: true });
    await addColIfMissing(queryInterface, "inventory_transactions", "finance_expense_id", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "inventory_transactions", "balance_after", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });

    // 3. Enrich inventory_requests
    await addColIfMissing(queryInterface, "inventory_requests", "needed_date", { type: Sequelize.DATEONLY, allowNull: true });
    await addColIfMissing(queryInterface, "inventory_requests", "expected_return_date", { type: Sequelize.DATEONLY, allowNull: true });
    await addColIfMissing(queryInterface, "inventory_requests", "approved_quantity", { type: Sequelize.INTEGER.UNSIGNED, allowNull: true });
    await addColIfMissing(queryInterface, "inventory_requests", "allocation_status", {
      type: Sequelize.ENUM("pending", "partially_approved", "approved", "issued", "returned", "rejected"),
      allowNull: false,
      defaultValue: "pending",
    });

    // 4. inventory_borrowings
    if (!(await tableExists(queryInterface, "inventory_borrowings"))) {
      await queryInterface.createTable("inventory_borrowings", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        item_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        borrower_member_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        borrower_name: { type: Sequelize.STRING(150), allowNull: false },
        event_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        ministry_group_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        quantity: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 1 },
        quantity_returned: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        borrowed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        due_return_date: { type: Sequelize.DATEONLY, allowNull: true },
        returned_at: { type: Sequelize.DATE, allowNull: true },
        return_condition: { type: Sequelize.ENUM("Good", "Fair", "Poor", "Damaged", "Lost"), allowNull: true },
        status: {
          type: Sequelize.ENUM("requested", "approved", "borrowed", "partially_returned", "returned", "overdue", "damaged", "lost"),
          allowNull: false,
          defaultValue: "borrowed",
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        recorded_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("inventory_borrowings", ["item_id", "status"], { name: "idx_inv_borrowings_item_status" });
    }

    // 5. inventory_maintenance
    if (!(await tableExists(queryInterface, "inventory_maintenance"))) {
      await queryInterface.createTable("inventory_maintenance", {
        id: { type: Sequelize.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
        item_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false },
        maintenance_date: { type: Sequelize.DATEONLY, allowNull: false },
        maintenance_type: {
          type: Sequelize.ENUM("inspection", "repair", "servicing", "calibration", "disposal"),
          allowNull: false,
          defaultValue: "repair",
        },
        vendor: { type: Sequelize.STRING(150), allowNull: true },
        cost: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        finance_expense_id: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        status: {
          type: Sequelize.ENUM("scheduled", "in_progress", "completed", "cancelled"),
          allowNull: false,
          defaultValue: "scheduled",
        },
        notes: { type: Sequelize.TEXT, allowNull: true },
        next_due_date: { type: Sequelize.DATEONLY, allowNull: true },
        recorded_by: { type: Sequelize.INTEGER.UNSIGNED, allowNull: true },
        is_deleted: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
        ...ts,
      });
      await queryInterface.addIndex("inventory_maintenance", ["item_id"], { name: "idx_inv_maint_item" });
    }
  },

  async down(queryInterface) {
    if (await tableExists(queryInterface, "inventory_maintenance")) await queryInterface.dropTable("inventory_maintenance");
    if (await tableExists(queryInterface, "inventory_borrowings")) await queryInterface.dropTable("inventory_borrowings");
  },
};
