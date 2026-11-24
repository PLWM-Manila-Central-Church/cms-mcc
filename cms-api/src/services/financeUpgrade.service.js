"use strict";

const { Op, fn, col, QueryTypes } = require("sequelize");
const sequelize = require("../config/db");
const AppError = require("../helpers/AppError");
const auditLog = require("../helpers/auditLog.helper");
const {
  Fund,
  Account,
  FinancialRecord,
  FinancialCategory,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  FinanceTransfer,
  FinanceApproval,
  Event,
  MinistryGroup,
  User,
} = require("../models");

const money = (v) => Math.round((Number(v) || 0) * 100) / 100;

const generateTxNumber = (prefix, dateStr) => {
  const ym = String(dateStr || new Date().toISOString().slice(0, 10)).replace(/-/g, "").slice(0, 6);
  const rand = String(Math.floor(1000 + Math.random() * 9000));
  return `${prefix}-${ym}-${rand}`;
};

const safeFindAll = (Model, opts) => (Model?.findAll ? Model.findAll(opts).catch(() => []) : Promise.resolve([]));

// ── Funds with live balances (Opening + Income - Paid Expenses + Transfers In - Transfers Out)
exports.listFundsWithBalances = async () => {
  const [funds, incRows, expRows, trfInRows, trfOutRows] = await Promise.all([
    safeFindAll(Fund, { order: [["name", "ASC"]] }),
    safeFindAll(FinancialRecord, {
      attributes: ["fund_id", [fn("SUM", col("amount")), "total"]],
      where: { fund_id: { [Op.ne]: null }, is_deleted: 0 },
      group: ["fund_id"],
      raw: true,
    }),
    safeFindAll(Expense, {
      attributes: ["fund_id", [fn("SUM", col("amount")), "total"]],
      where: { fund_id: { [Op.ne]: null }, is_deleted: 0, status: "paid" },
      group: ["fund_id"],
      raw: true,
    }),
    safeFindAll(FinanceTransfer, {
      attributes: ["to_fund_id", [fn("SUM", col("amount")), "total"]],
      where: { to_fund_id: { [Op.ne]: null }, is_deleted: 0 },
      group: ["to_fund_id"],
      raw: true,
    }),
    safeFindAll(FinanceTransfer, {
      attributes: ["from_fund_id", [fn("SUM", col("amount")), "total"]],
      where: { from_fund_id: { [Op.ne]: null }, is_deleted: 0 },
      group: ["from_fund_id"],
      raw: true,
    }),
  ]);

  const mapOf = (rows, key) => new Map(rows.map((r) => [Number(r[key]), money(r.total)]));
  const incMap = mapOf(incRows, "fund_id");
  const expMap = mapOf(expRows, "fund_id");
  const inMap = mapOf(trfInRows, "to_fund_id");
  const outMap = mapOf(trfOutRows, "from_fund_id");

  return funds.map((f) => {
    const plain = f.toJSON ? f.toJSON() : f;
    const opening = money(plain.opening_balance);
    const income = incMap.get(plain.id) || 0;
    const paidExpenses = expMap.get(plain.id) || 0;
    const transfersIn = inMap.get(plain.id) || 0;
    const transfersOut = outMap.get(plain.id) || 0;
    return {
      ...plain,
      opening_balance: opening,
      income_total: income,
      expense_total: paidExpenses,
      transfers_in: transfersIn,
      transfers_out: transfersOut,
      current_balance: money(opening + income - paidExpenses + transfersIn - transfersOut),
    };
  });
};

// ── Financial Accounts with live balances (transfers move money between accounts without inflating income/expense)
exports.listAccountsWithBalances = async () => {
  const [accounts, incRows, expRows, trfInRows, trfOutRows] = await Promise.all([
    safeFindAll(Account, { order: [["name", "ASC"]] }),
    safeFindAll(FinancialRecord, {
      attributes: ["account_id", [fn("SUM", col("amount")), "total"]],
      where: { account_id: { [Op.ne]: null }, is_deleted: 0 },
      group: ["account_id"],
      raw: true,
    }),
    safeFindAll(Expense, {
      attributes: ["account_id", [fn("SUM", col("amount")), "total"]],
      where: { account_id: { [Op.ne]: null }, is_deleted: 0, status: "paid" },
      group: ["account_id"],
      raw: true,
    }),
    safeFindAll(FinanceTransfer, {
      attributes: ["to_account_id", [fn("SUM", col("amount")), "total"]],
      where: { to_account_id: { [Op.ne]: null }, is_deleted: 0 },
      group: ["to_account_id"],
      raw: true,
    }),
    safeFindAll(FinanceTransfer, {
      attributes: ["from_account_id", [fn("SUM", col("amount")), "total"]],
      where: { from_account_id: { [Op.ne]: null }, is_deleted: 0 },
      group: ["from_account_id"],
      raw: true,
    }),
  ]);

  const mapOf = (rows, key) => new Map(rows.map((r) => [Number(r[key]), money(r.total)]));
  const incMap = mapOf(incRows, "account_id");
  const expMap = mapOf(expRows, "account_id");
  const inMap = mapOf(trfInRows, "to_account_id");
  const outMap = mapOf(trfOutRows, "from_account_id");

  return accounts.map((a) => {
    const plain = a.toJSON ? a.toJSON() : a;
    const opening = money(plain.opening_balance);
    const income = incMap.get(plain.id) || 0;
    const paidExpenses = expMap.get(plain.id) || 0;
    const transfersIn = inMap.get(plain.id) || 0;
    const transfersOut = outMap.get(plain.id) || 0;
    return {
      ...plain,
      opening_balance: opening,
      income_total: income,
      expense_total: paidExpenses,
      transfers_in: transfersIn,
      transfers_out: transfersOut,
      current_balance: money(opening + income - paidExpenses + transfersIn - transfersOut),
    };
  });
};

// ── Transfers (Excluded from Income & Expense totals)
exports.listTransfers = async ({ limit = 50 } = {}) => {
  const capped = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
  return safeFindAll(FinanceTransfer, {
    include: [
      { model: Account, as: "fromAccount", attributes: ["id", "name", "account_type"], required: false },
      { model: Account, as: "toAccount", attributes: ["id", "name", "account_type"], required: false },
      { model: Fund, as: "fromFund", attributes: ["id", "name"], required: false },
      { model: Fund, as: "toFund", attributes: ["id", "name"], required: false },
    ],
    order: [["transfer_date", "DESC"], ["id", "DESC"]],
    limit: capped,
  });
};

exports.createTransfer = async (payload, user) => {
  const amount = money(payload.amount);
  if (amount <= 0) throw AppError.badRequest("VALIDATION_ERROR", "Transfer amount must be greater than zero.");
  const hasAccountTransfer = payload.from_account_id && payload.to_account_id;
  const hasFundTransfer = payload.from_fund_id && payload.to_fund_id;
  if (!hasAccountTransfer && !hasFundTransfer) {
    throw AppError.badRequest("VALIDATION_ERROR", "Specify source and destination accounts or funds.");
  }
  if (hasAccountTransfer && Number(payload.from_account_id) === Number(payload.to_account_id)) {
    throw AppError.badRequest("VALIDATION_ERROR", "Source and destination accounts must be different.");
  }
  if (hasFundTransfer && Number(payload.from_fund_id) === Number(payload.to_fund_id)) {
    throw AppError.badRequest("VALIDATION_ERROR", "Source and destination funds must be different.");
  }

  const transferDate = payload.transfer_date || new Date().toISOString().slice(0, 10);
  const created = await FinanceTransfer.create({
    transaction_number: generateTxNumber("TRF", transferDate),
    transfer_date: transferDate,
    amount,
    from_account_id: payload.from_account_id || null,
    to_account_id: payload.to_account_id || null,
    from_fund_id: payload.from_fund_id || null,
    to_fund_id: payload.to_fund_id || null,
    reference_number: payload.reference_number || null,
    remarks: payload.remarks || null,
    created_by: user.userId,
  });
  auditLog.log({ userId: user.userId, action: "CREATE_FINANCE_TRANSFER", targetTable: "finance_transfers", targetId: created.id });
  return created;
};

exports.archiveTransfer = async (id, user) => {
  const row = await FinanceTransfer.findByPk(id);
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Transfer not found");
  await row.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: user.userId });
  auditLog.log({ userId: user.userId, action: "ARCHIVE_FINANCE_TRANSFER", targetTable: "finance_transfers", targetId: row.id });
  return { id: row.id, archived: true };
};

// ── Expense Approval Workflow (Draft -> Pending Approval -> Approved -> Paid; Rejected / Cancelled)
exports.listWorkflowExpenses = async ({ status, limit = 50 } = {}) => {
  const where = { is_deleted: 0 };
  if (status && status !== "all") where.status = status;
  return safeFindAll(Expense, {
    where,
    include: [
      { model: ExpenseCategory, as: "category", attributes: ["id", "category_name"], required: false },
      { model: PaymentMethod, as: "paymentMethod", attributes: ["id", "method_name"], required: false },
      { model: Fund, as: "fund", attributes: ["id", "name"], required: false },
      { model: Account, as: "account", attributes: ["id", "name"], required: false },
      { model: Event, as: "event", attributes: ["id", "title"], required: false },
      { model: MinistryGroup, as: "ministryGroup", attributes: ["id", "name"], required: false },
      { model: User, as: "requester", attributes: ["id", "email"], required: false },
      { model: User, as: "approver", attributes: ["id", "email"], required: false },
      { model: User, as: "payer", attributes: ["id", "email"], required: false },
    ],
    order: [["date", "DESC"], ["id", "DESC"]],
    limit: Math.min(100, Math.max(1, parseInt(limit, 10) || 50)),
  });
};

exports.createExpenseRequest = async (payload, user) => {
  const amount = money(payload.amount);
  if (amount <= 0) throw AppError.badRequest("VALIDATION_ERROR", "Amount must be positive.");
  const initialStatus = payload.submit_immediately ? "pending_approval" : (payload.status || "draft");
  if (!["draft", "pending_approval", "paid"].includes(initialStatus)) {
    throw AppError.badRequest("VALIDATION_ERROR", "Invalid initial expense status.");
  }
  const dateStr = payload.date || new Date().toISOString().slice(0, 10);
  const created = await Expense.create({
    transaction_number: generateTxNumber("EXP", dateStr),
    category_id: Number(payload.category_id),
    payment_method_id: Number(payload.payment_method_id),
    fund_id: payload.fund_id ? Number(payload.fund_id) : null,
    account_id: payload.account_id ? Number(payload.account_id) : null,
    event_id: payload.event_id ? Number(payload.event_id) : null,
    ministry_group_id: payload.ministry_group_id ? Number(payload.ministry_group_id) : null,
    date: dateStr,
    amount,
    payee: payload.payee || null,
    description: payload.description || null,
    remarks: payload.remarks || null,
    status: initialStatus,
    requested_by: user.userId,
    created_by: user.userId,
    ...(initialStatus === "paid" ? { paid_by: user.userId, paid_at: new Date() } : {}),
  });

  if (initialStatus === "pending_approval" && FinanceApproval?.create) {
    await FinanceApproval.create({
      entity_type: "expense",
      entity_id: created.id,
      action: "submitted",
      actor_user_id: user.userId,
      remarks: payload.remarks || null,
    }).catch(() => {});
  }
  auditLog.log({ userId: user.userId, action: "CREATE_EXPENSE_REQUEST", targetTable: "expenses", targetId: created.id });
  return created;
};

exports.transitionExpenseStatus = async (expenseId, action, payload = {}, user) => {
  const expense = await Expense.findByPk(expenseId);
  if (!expense) throw AppError.notFound("RECORD_NOT_FOUND", "Expense not found");

  const now = new Date();
  if (action === "submit") {
    if (!["draft", "rejected"].includes(expense.status)) {
      throw AppError.badRequest("INVALID_STATE", `Cannot submit an expense in status '${expense.status}'.`);
    }
    await expense.update({ status: "pending_approval", rejection_reason: null });
  } else if (action === "approve") {
    if (expense.status !== "pending_approval") {
      throw AppError.badRequest("INVALID_STATE", "Only pending expenses can be approved.");
    }
    // Maker-checker control for non-admin users when requester is recorded
    if (expense.requested_by && Number(expense.requested_by) === Number(user.userId) && user.roleName !== "System Admin") {
      throw AppError.forbidden("A different authorized approver must approve this expense request.");
    }
    await expense.update({ status: "approved", approved_by: user.userId, approved_at: now, rejection_reason: null });
  } else if (action === "reject") {
    if (!["pending_approval", "approved"].includes(expense.status)) {
      throw AppError.badRequest("INVALID_STATE", "Only pending or approved expenses can be rejected.");
    }
    const reason = String(payload.reason || "").trim();
    if (!reason) throw AppError.badRequest("VALIDATION_ERROR", "Rejection reason is required.");
    await expense.update({ status: "rejected", rejection_reason: reason });
  } else if (action === "mark-paid") {
    if (expense.status !== "approved") {
      throw AppError.badRequest("INVALID_STATE", "Only approved expenses can be marked as paid.");
    }
    await expense.update({
      status: "paid",
      paid_by: user.userId,
      paid_at: now,
      payment_reference: payload.payment_reference || expense.payment_reference || null,
      account_id: payload.account_id ? Number(payload.account_id) : expense.account_id,
    });
  } else if (action === "cancel") {
    if (expense.status === "paid") {
      throw AppError.badRequest("INVALID_STATE", "Paid expenses cannot be cancelled; archive with reason instead.");
    }
    await expense.update({ status: "cancelled", remarks: payload.remarks || expense.remarks });
  } else {
    throw AppError.badRequest("VALIDATION_ERROR", "Unsupported workflow action.");
  }

  const auditActionMap = {
    submit: "submitted",
    approve: "approved",
    reject: "rejected",
    "mark-paid": "paid",
    cancel: "cancelled",
  };
  if (FinanceApproval?.create) {
    await FinanceApproval.create({
      entity_type: "expense",
      entity_id: expense.id,
      action: auditActionMap[action],
      actor_user_id: user.userId,
      remarks: payload.reason || payload.remarks || payload.payment_reference || null,
    }).catch(() => {});
  }
  auditLog.log({ userId: user.userId, action: `EXPENSE_${auditActionMap[action].toUpperCase()}`, targetTable: "expenses", targetId: expense.id });
  return expense;
};

// ── Finance Overview
exports.getFinanceOverview = async ({ date_from, date_to } = {}) => {
  const dateFilterInc = {};
  const dateFilterExp = {};
  if (date_from || date_to) {
    dateFilterInc.transaction_date = {};
    dateFilterExp.date = {};
    if (date_from) {
      dateFilterInc.transaction_date[Op.gte] = date_from;
      dateFilterExp.date[Op.gte] = date_from;
    }
    if (date_to) {
      dateFilterInc.transaction_date[Op.lte] = date_to;
      dateFilterExp.date[Op.lte] = date_to;
    }
  }

  const [incomeTotal, paidExpTotal, pendingExpRows, approvedUnpaidRows, funds, accounts] = await Promise.all([
    FinancialRecord.sum("amount", { where: { is_deleted: 0, ...dateFilterInc } }).catch(() => 0),
    Expense.sum("amount", { where: { is_deleted: 0, status: "paid", ...dateFilterExp } }).catch(() => 0),
    safeFindAll(Expense, {
      attributes: [[fn("COUNT", col("id")), "cnt"], [fn("SUM", col("amount")), "total"]],
      where: { is_deleted: 0, status: "pending_approval" },
      raw: true,
    }),
    safeFindAll(Expense, {
      attributes: [[fn("COUNT", col("id")), "cnt"], [fn("SUM", col("amount")), "total"]],
      where: { is_deleted: 0, status: "approved" },
      raw: true,
    }),
    exports.listFundsWithBalances(),
    exports.listAccountsWithBalances(),
  ]);

  const income = money(incomeTotal);
  const paidExpenses = money(paidExpTotal);

  return {
    total_income: income,
    total_paid_expenses: paidExpenses,
    net_balance: money(income - paidExpenses),
    pending_approval_count: Number(pendingExpRows[0]?.cnt || 0),
    pending_approval_total: money(pendingExpRows[0]?.total),
    approved_unpaid_count: Number(approvedUnpaidRows[0]?.cnt || 0),
    approved_unpaid_total: money(approvedUnpaidRows[0]?.total),
    funds,
    accounts,
  };
};

// ── 5 Expense Report Views (monthly_category, detail, annual, by_ministry, by_event)
exports.getExpenseReport = async ({ report_type = "monthly_category", date_from, date_to, year } = {}) => {
  const today = new Date().toISOString().slice(0, 10);
  const yr = year || today.slice(0, 4);
  const from = date_from || `${yr}-01-01`;
  const to = date_to || `${yr}-12-31`;

  if (report_type === "monthly_category") {
    const rows = await sequelize.query(
      `SELECT COALESCE(ec.category_name, 'Uncategorized') AS category,
              COUNT(e.id) AS count,
              SUM(e.amount) AS total
       FROM expenses e
       LEFT JOIN expense_categories ec ON ec.id = e.category_id
       WHERE e.is_deleted = 0 AND e.status = 'paid' AND e.date BETWEEN :from AND :to
       GROUP BY ec.category_name
       ORDER BY total DESC`,
      { type: QueryTypes.SELECT, replacements: { from, to } }
    ).catch(() => []);
    const grandTotal = money(rows.reduce((s, r) => s + money(r.total), 0));
    return { report_type, from, to, grand_total: grandTotal, rows: rows.map((r) => ({ ...r, count: Number(r.count), total: money(r.total) })) };
  }

  if (report_type === "annual") {
    const rows = await sequelize.query(
      `SELECT DATE_FORMAT(e.date, '%Y-%m') AS month,
              COUNT(e.id) AS count,
              SUM(e.amount) AS total
       FROM expenses e
       WHERE e.is_deleted = 0 AND e.status = 'paid' AND e.date BETWEEN :from AND :to
       GROUP BY month
       ORDER BY month ASC`,
      { type: QueryTypes.SELECT, replacements: { from: `${yr}-01-01`, to: `${yr}-12-31` } }
    ).catch(() => []);
    const grandTotal = money(rows.reduce((s, r) => s + money(r.total), 0));
    return { report_type, year: yr, grand_total: grandTotal, rows: rows.map((r) => ({ ...r, count: Number(r.count), total: money(r.total) })) };
  }

  if (report_type === "by_ministry") {
    const rows = await sequelize.query(
      `SELECT COALESCE(mg.name, 'Church-wide / Unassigned') AS ministry,
              COUNT(e.id) AS count,
              SUM(e.amount) AS total
       FROM expenses e
       LEFT JOIN ministry_groups mg ON mg.id = e.ministry_group_id
       WHERE e.is_deleted = 0 AND e.status = 'paid' AND e.date BETWEEN :from AND :to
       GROUP BY mg.name
       ORDER BY total DESC`,
      { type: QueryTypes.SELECT, replacements: { from, to } }
    ).catch(() => []);
    const grandTotal = money(rows.reduce((s, r) => s + money(r.total), 0));
    return { report_type, from, to, grand_total: grandTotal, rows: rows.map((r) => ({ ...r, count: Number(r.count), total: money(r.total) })) };
  }

  if (report_type === "by_event") {
    const rows = await sequelize.query(
      `SELECT COALESCE(ev.title, 'General Operations') AS event,
              COUNT(e.id) AS count,
              SUM(e.amount) AS total
       FROM expenses e
       LEFT JOIN events ev ON ev.id = e.event_id
       WHERE e.is_deleted = 0 AND e.status = 'paid' AND e.date BETWEEN :from AND :to
       GROUP BY ev.title
       ORDER BY total DESC`,
      { type: QueryTypes.SELECT, replacements: { from, to } }
    ).catch(() => []);
    const grandTotal = money(rows.reduce((s, r) => s + money(r.total), 0));
    return { report_type, from, to, grand_total: grandTotal, rows: rows.map((r) => ({ ...r, count: Number(r.count), total: money(r.total) })) };
  }

  // Default: 'detail'
  const rows = await safeFindAll(Expense, {
    where: { is_deleted: 0, status: "paid", date: { [Op.between]: [from, to] } },
    include: [
      { model: ExpenseCategory, as: "category", attributes: ["id", "category_name"], required: false },
      { model: Fund, as: "fund", attributes: ["id", "name"], required: false },
      { model: Account, as: "account", attributes: ["id", "name"], required: false },
      { model: Event, as: "event", attributes: ["id", "title"], required: false },
      { model: MinistryGroup, as: "ministryGroup", attributes: ["id", "name"], required: false },
    ],
    order: [["date", "DESC"], ["id", "DESC"]],
    limit: 200,
  });
  const grandTotal = money(rows.reduce((s, r) => s + money(r.amount), 0));
  return { report_type: "detail", from, to, grand_total: grandTotal, rows };
};

// ── Consolidated Monthly Financial Statement: Ending = Beginning + Income - Paid Expenses
exports.getConsolidatedStatement = async ({ date_from, date_to } = {}) => {
  const today = new Date().toISOString().slice(0, 10);
  const from = date_from || `${today.slice(0, 7)}-01`;
  const to = date_to || today;

  const [
    openingAccounts,
    priorIncome,
    priorExpenses,
    periodIncome,
    periodExpenses,
    periodTransfers,
    incomeByCategory,
    expenseByCategory,
  ] = await Promise.all([
    Account.sum("opening_balance", { where: { is_deleted: 0 } }).catch(() => 0),
    FinancialRecord.sum("amount", { where: { is_deleted: 0, transaction_date: { [Op.lt]: from } } }).catch(() => 0),
    Expense.sum("amount", { where: { is_deleted: 0, status: "paid", date: { [Op.lt]: from } } }).catch(() => 0),
    FinancialRecord.sum("amount", { where: { is_deleted: 0, transaction_date: { [Op.between]: [from, to] } } }).catch(() => 0),
    Expense.sum("amount", { where: { is_deleted: 0, status: "paid", date: { [Op.between]: [from, to] } } }).catch(() => 0),
    FinanceTransfer.sum("amount", { where: { is_deleted: 0, transfer_date: { [Op.between]: [from, to] } } }).catch(() => 0),
    sequelize.query(
      `SELECT COALESCE(fc.name, 'Uncategorized') AS category, SUM(fr.amount) AS total
       FROM financial_records fr
       LEFT JOIN financial_categories fc ON fc.id = fr.category_id
       WHERE fr.is_deleted = 0 AND fr.transaction_date BETWEEN :from AND :to
       GROUP BY fc.name ORDER BY total DESC`,
      { type: QueryTypes.SELECT, replacements: { from, to } }
    ).catch(() => []),
    sequelize.query(
      `SELECT COALESCE(ec.category_name, 'Uncategorized') AS category, SUM(e.amount) AS total
       FROM expenses e
       LEFT JOIN expense_categories ec ON ec.id = e.category_id
       WHERE e.is_deleted = 0 AND e.status = 'paid' AND e.date BETWEEN :from AND :to
       GROUP BY ec.category_name ORDER BY total DESC`,
      { type: QueryTypes.SELECT, replacements: { from, to } }
    ).catch(() => []),
  ]);

  const beginningBalance = money(money(openingAccounts) + money(priorIncome) - money(priorExpenses));
  const totalIncome = money(periodIncome);
  const totalExpenses = money(periodExpenses);
  const netChange = money(totalIncome - totalExpenses);
  const endingBalance = money(beginningBalance + netChange);

  return {
    from,
    to,
    beginning_balance: beginningBalance,
    total_income: totalIncome,
    total_expenses: totalExpenses,
    net_change: netChange,
    ending_balance: endingBalance,
    internal_transfers_excluded: money(periodTransfers),
    income_by_category: incomeByCategory.map((r) => ({ category: r.category, total: money(r.total) })),
    expense_by_category: expenseByCategory.map((r) => ({ category: r.category, total: money(r.total) })),
  };
};

// ── Unified Chronological Audit Ledger (Income + Paid Expenses + Transfers)
exports.getLedger = async ({ date_from, date_to, type = "all", limit = 100 } = {}) => {
  const capped = Math.min(100, Math.max(1, parseInt(limit, 10) || 100));
  const dateWhere = (field) => (date_from || date_to ? {
    [field]: {
      ...(date_from ? { [Op.gte]: date_from } : {}),
      ...(date_to ? { [Op.lte]: date_to } : {}),
    },
  } : {});

  const [incomes, expenses, transfers] = await Promise.all([
    type === "all" || type === "income"
      ? safeFindAll(FinancialRecord, {
          where: { is_deleted: 0, ...dateWhere("transaction_date") },
          include: [{ model: FinancialCategory, as: "category", attributes: ["name"], required: false }],
          order: [["transaction_date", "DESC"], ["id", "DESC"]],
          limit: capped,
        })
      : Promise.resolve([]),
    type === "all" || type === "expense"
      ? safeFindAll(Expense, {
          where: { is_deleted: 0, ...dateWhere("date") },
          include: [{ model: ExpenseCategory, as: "category", attributes: ["category_name"], required: false }],
          order: [["date", "DESC"], ["id", "DESC"]],
          limit: capped,
        })
      : Promise.resolve([]),
    type === "all" || type === "transfer"
      ? safeFindAll(FinanceTransfer, {
          where: { is_deleted: 0, ...dateWhere("transfer_date") },
          order: [["transfer_date", "DESC"], ["id", "DESC"]],
          limit: capped,
        })
      : Promise.resolve([]),
  ]);

  const entries = [
    ...incomes.map((r) => ({
      entry_type: "income",
      id: r.id,
      transaction_number: r.transaction_number || `INC-${r.id}`,
      date: r.transaction_date,
      category: r.category?.name || "Giving",
      description: r.notes || r.receipt_number || "Contribution",
      amount: money(r.amount),
      status: r.approval_status || "posted",
    })),
    ...expenses.map((e) => ({
      entry_type: "expense",
      id: e.id,
      transaction_number: e.transaction_number || `EXP-${e.id}`,
      date: e.date,
      category: e.category?.category_name || "Expense",
      description: e.payee ? `${e.payee} — ${e.description || ""}` : (e.description || "Expense"),
      amount: -money(e.amount),
      status: e.status || "paid",
    })),
    ...transfers.map((t) => ({
      entry_type: "transfer",
      id: t.id,
      transaction_number: t.transaction_number || `TRF-${t.id}`,
      date: t.transfer_date,
      category: "Internal Transfer",
      description: t.remarks || t.reference_number || "Account / Fund transfer",
      amount: money(t.amount),
      status: "transferred",
    })),
  ];

  entries.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
  return entries.slice(0, capped);
};
