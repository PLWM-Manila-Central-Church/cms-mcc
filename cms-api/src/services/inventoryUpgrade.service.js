"use strict";

const sequelize = require("../config/db");
const AppError = require("../helpers/AppError");
const auditLog = require("../helpers/auditLog.helper");
const {
  InventoryItem,
  InventoryTransaction,
  InventoryBorrowing,
  InventoryMaintenance,
  Expense,
  ExpenseCategory,
  PaymentMethod,
} = require("../models");

const money = (v) => Math.round((Number(v) || 0) * 100) / 100;
const safeFind = (M, opts) => (M?.findAll ? M.findAll(opts).catch(() => []) : Promise.resolve([]));

const deriveStockStatus = (item, qty) => {
  if (item.status === "Under Repair") return "Under Repair";
  if (qty <= 0) return "Out of Stock";
  if (item.low_stock_threshold != null && qty <= Number(item.low_stock_threshold)) return "Low Stock";
  return "Available";
};

// ── Authoritative Transactional Stock Movement (with FOR UPDATE lock & non-negative guard)
exports.recordStockMovement = async (payload, user) => {
  const itemId = Number(payload.item_id);
  const delta = parseInt(payload.quantity_delta, 10);
  if (!itemId || !delta) {
    throw AppError.badRequest("VALIDATION_ERROR", "Item and non-zero quantity change are required.");
  }
  const allowedTypes = ["initial", "adjustment", "usage", "request_fulfillment", "return"];
  const txType = allowedTypes.includes(payload.transaction_type) ? payload.transaction_type : (delta > 0 ? "adjustment" : "usage");

  const result = await sequelize.transaction(async (transaction) => {
    const item = await InventoryItem.findOne({
      where: { id: itemId, is_deleted: 0 },
      lock: transaction.LOCK?.UPDATE,
      transaction,
    });
    if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");

    const nextQty = Number(item.quantity || 0) + delta;
    if (nextQty < 0) {
      throw AppError.badRequest("INSUFFICIENT_STOCK", `Cannot reduce stock below 0 (current: ${item.quantity}, requested change: ${delta}).`);
    }

    let financeExpenseId = null;
    if (payload.create_finance_purchase_request && delta > 0 && Number(payload.unit_cost || 0) > 0) {
      const totalCost = money(delta * Number(payload.unit_cost));
      const cat = await ExpenseCategory.findOne({ transaction }).catch(() => null);
      const pm = await PaymentMethod.findOne({ transaction }).catch(() => null);
      const exp = await Expense.create({
        transaction_number: `EXP-INV-${item.id}-${Date.now().toString().slice(-4)}`,
        category_id: cat?.id || 1,
        payment_method_id: pm?.id || 1,
        date: new Date().toISOString().slice(0, 10),
        amount: totalCost,
        payee: payload.supplier || "Inventory Supplier",
        description: `Inventory Restock: ${delta} x ${item.name}`,
        status: "pending_approval",
        requested_by: user.userId,
        created_by: user.userId,
      }, { transaction });
      financeExpenseId = exp.id;
    }

    const nextStatus = deriveStockStatus(item, nextQty);
    await item.update({
      quantity: nextQty,
      status: nextStatus,
      ...(payload.unit_cost != null ? { unit_cost: money(payload.unit_cost) } : {}),
      ...(payload.supplier ? { supplier: payload.supplier } : {}),
    }, { transaction });

    const tx = await InventoryTransaction.create({
      item_id: item.id,
      transaction_type: txType,
      quantity_delta: delta,
      unit_cost: payload.unit_cost != null ? money(payload.unit_cost) : null,
      supplier: payload.supplier || null,
      reference_doc_key: payload.reference_doc_key || null,
      finance_expense_id: financeExpenseId,
      balance_after: nextQty,
      source_type: payload.source_type || "manual_ledger",
      source_id: payload.source_id || null,
      notes: payload.notes || null,
      recorded_by: user.userId,
      occurred_at: new Date(),
    }, { transaction });

    return { item, transaction: tx, finance_expense_id: financeExpenseId };
  });

  auditLog.log({ userId: user.userId, action: "INVENTORY_STOCK_MOVEMENT", targetTable: "inventory_transactions", targetId: result.transaction.id });
  return result;
};

exports.listTransactions = async ({ item_id, limit = 80 } = {}) => {
  const where = item_id ? { item_id: Number(item_id) } : {};
  return safeFind(InventoryTransaction, {
    where,
    include: [{ model: InventoryItem, as: "item", attributes: ["id", "name", "unit", "item_type"], required: false }],
    order: [["occurred_at", "DESC"], ["id", "DESC"]],
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 80)),
  });
};

// ── Borrowing & Returns Reconciliation
exports.listBorrowings = async () => {
  const rows = await safeFind(InventoryBorrowing, {
    where: { is_deleted: 0 },
    include: [{ model: InventoryItem, as: "item", attributes: ["id", "name", "unit", "item_code"], required: false }],
    order: [["borrowed_at", "DESC"], ["id", "DESC"]],
    limit: 100,
  });
  const today = new Date().toISOString().slice(0, 10);
  return rows.map((r) => {
    const plain = r.toJSON ? r.toJSON() : r;
    const isOverdue = ["borrowed", "partially_returned"].includes(plain.status)
      && plain.due_return_date
      && String(plain.due_return_date) < today;
    return { ...plain, is_overdue: Boolean(isOverdue), effective_status: isOverdue ? "overdue" : plain.status };
  });
};

exports.createBorrowing = async (payload, user) => {
  const itemId = Number(payload.item_id);
  const qty = parseInt(payload.quantity, 10) || 1;
  const borrowerName = String(payload.borrower_name || "").trim();
  if (!itemId || qty <= 0 || !borrowerName) {
    throw AppError.badRequest("VALIDATION_ERROR", "Item, borrower name, and positive quantity are required.");
  }

  const result = await sequelize.transaction(async (transaction) => {
    const item = await InventoryItem.findOne({
      where: { id: itemId, is_deleted: 0 },
      lock: transaction.LOCK?.UPDATE,
      transaction,
    });
    if (!item) throw AppError.notFound("RECORD_NOT_FOUND", "Inventory item not found");
    const nextQty = Number(item.quantity || 0) - qty;
    if (nextQty < 0) {
      throw AppError.badRequest("INSUFFICIENT_STOCK", `Only ${item.quantity} unit(s) available to borrow.`);
    }

    await item.update({ quantity: nextQty, status: deriveStockStatus(item, nextQty) }, { transaction });
    const borrowing = await InventoryBorrowing.create({
      item_id: item.id,
      borrower_member_id: payload.borrower_member_id || null,
      borrower_name: borrowerName,
      event_id: payload.event_id || null,
      ministry_group_id: payload.ministry_group_id || null,
      quantity: qty,
      quantity_returned: 0,
      due_return_date: payload.due_return_date || null,
      status: "borrowed",
      notes: payload.notes || null,
      recorded_by: user.userId,
    }, { transaction });

    await InventoryTransaction.create({
      item_id: item.id,
      transaction_type: "request_fulfillment",
      quantity_delta: -qty,
      balance_after: nextQty,
      source_type: "borrowing",
      source_id: borrowing.id,
      notes: `Borrowed by ${borrowerName}`,
      recorded_by: user.userId,
      occurred_at: new Date(),
    }, { transaction });

    return borrowing;
  });

  auditLog.log({ userId: user.userId, action: "INVENTORY_BORROW", targetTable: "inventory_borrowings", targetId: result.id });
  return result;
};

exports.returnBorrowing = async (borrowingId, payload, user) => {
  const qtyReturning = parseInt(payload.quantity_returned, 10);
  const condition = payload.return_condition || "Good";
  if (!qtyReturning || qtyReturning <= 0) {
    throw AppError.badRequest("VALIDATION_ERROR", "Return quantity must be positive.");
  }

  const result = await sequelize.transaction(async (transaction) => {
    const borrowing = await InventoryBorrowing.findOne({
      where: { id: borrowingId, is_deleted: 0 },
      lock: transaction.LOCK?.UPDATE,
      transaction,
    });
    if (!borrowing) throw AppError.notFound("RECORD_NOT_FOUND", "Borrowing record not found");
    const remaining = Number(borrowing.quantity) - Number(borrowing.quantity_returned || 0);
    if (qtyReturning > remaining) {
      throw AppError.badRequest("VALIDATION_ERROR", `Only ${remaining} unit(s) remain unreturned.`);
    }

    const totalReturned = Number(borrowing.quantity_returned || 0) + qtyReturning;
    let nextBorrowStatus = totalReturned >= Number(borrowing.quantity) ? "returned" : "partially_returned";
    if (condition === "Damaged") nextBorrowStatus = "damaged";
    if (condition === "Lost") nextBorrowStatus = "lost";

    const item = await InventoryItem.findOne({
      where: { id: borrowing.item_id, is_deleted: 0 },
      lock: transaction.LOCK?.UPDATE,
      transaction,
    });

    if (item && condition !== "Lost") {
      const nextQty = Number(item.quantity || 0) + qtyReturning;
      const nextStatus = condition === "Damaged" ? "Under Repair" : deriveStockStatus(item, nextQty);
      await item.update({ quantity: nextQty, status: nextStatus }, { transaction });
      await InventoryTransaction.create({
        item_id: item.id,
        transaction_type: "return",
        quantity_delta: qtyReturning,
        balance_after: nextQty,
        source_type: "borrowing_return",
        source_id: borrowing.id,
        notes: `Returned (${condition}) by ${borrowing.borrower_name}`,
        recorded_by: user.userId,
        occurred_at: new Date(),
      }, { transaction });
    }

    await borrowing.update({
      quantity_returned: totalReturned,
      return_condition: condition,
      status: nextBorrowStatus,
      returned_at: totalReturned >= Number(borrowing.quantity) ? new Date() : borrowing.returned_at,
      notes: payload.notes ? `${borrowing.notes || ""}\nReturn: ${payload.notes}`.trim() : borrowing.notes,
    }, { transaction });

    return borrowing;
  });

  auditLog.log({ userId: user.userId, action: "INVENTORY_RETURN", targetTable: "inventory_borrowings", targetId: result.id });
  return result;
};

// ── Maintenance & Repairs
exports.listMaintenance = async () => {
  return safeFind(InventoryMaintenance, {
    where: { is_deleted: 0 },
    include: [{ model: InventoryItem, as: "item", attributes: ["id", "name", "item_code"], required: false }],
    order: [["maintenance_date", "DESC"], ["id", "DESC"]],
    limit: 100,
  });
};

exports.createMaintenance = async (payload, user) => {
  const itemId = Number(payload.item_id);
  if (!itemId) throw AppError.badRequest("VALIDATION_ERROR", "Item is required.");
  const created = await InventoryMaintenance.create({
    item_id: itemId,
    maintenance_date: payload.maintenance_date || new Date().toISOString().slice(0, 10),
    maintenance_type: payload.maintenance_type || "repair",
    vendor: payload.vendor || null,
    cost: money(payload.cost || 0),
    status: payload.status || "in_progress",
    notes: payload.notes || null,
    next_due_date: payload.next_due_date || null,
    recorded_by: user.userId,
  });
  if (created.status === "in_progress") {
    await InventoryItem.update({ status: "Under Repair" }, { where: { id: itemId } }).catch(() => {});
  }
  auditLog.log({ userId: user.userId, action: "LOG_INVENTORY_MAINTENANCE", targetTable: "inventory_maintenance", targetId: created.id });
  return created;
};

exports.completeMaintenance = async (maintId) => {
  const row = await InventoryMaintenance.findOne({ where: { id: maintId, is_deleted: 0 } });
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Maintenance log not found");
  await row.update({ status: "completed" });
  const item = await InventoryItem.findByPk(row.item_id).catch(() => null);
  if (item && item.status === "Under Repair") {
    const qty = Number(item.quantity || 0);
    await item.update({ status: qty <= 0 ? "Out of Stock" : "Available" });
  }
  return row;
};

// ── Extended 9 Inventory Reports Summary
exports.getExtendedReports = async () => {
  const [items, borrowings, maintLogs, recentTx] = await Promise.all([
    safeFind(InventoryItem, { where: { is_deleted: 0 } }),
    exports.listBorrowings(),
    exports.listMaintenance(),
    exports.listTransactions({ limit: 30 }),
  ]);

  const assets = items.filter((i) => (i.item_type || "reusable_asset") === "reusable_asset");
  const consumables = items.filter((i) => i.item_type === "consumable");
  const totalValuation = money(items.reduce((s, i) => s + Number(i.quantity || 0) * money(i.unit_cost), 0));
  const lowStockItems = items.filter((i) => i.status === "Low Stock" || i.status === "Out of Stock");
  const activeBorrowings = borrowings.filter((b) => ["borrowed", "partially_returned", "overdue"].includes(b.effective_status));
  const overdueBorrowings = borrowings.filter((b) => b.is_overdue);
  const maintenanceCost = money(maintLogs.reduce((s, m) => s + money(m.cost), 0));

  const byLocationMap = new Map();
  for (const i of items) {
    const loc = i.location || "Unspecified";
    byLocationMap.set(loc, (byLocationMap.get(loc) || 0) + 1);
  }

  return {
    summary: {
      total_items: items.length,
      reusable_assets: assets.length,
      consumables: consumables.length,
      total_valuation_php: totalValuation,
      low_or_out_of_stock: lowStockItems.length,
      active_borrowings: activeBorrowings.length,
      overdue_borrowings: overdueBorrowings.length,
      under_repair: items.filter((i) => i.status === "Under Repair").length,
      total_maintenance_cost_php: maintenanceCost,
    },
    by_location: [...byLocationMap.entries()].map(([location, count]) => ({ location, count })),
    overdue_list: overdueBorrowings.slice(0, 15),
    recent_movements: recentTx.slice(0, 15),
  };
};
