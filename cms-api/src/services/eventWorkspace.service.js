"use strict";

const sequelize = require("../config/db");
const AppError = require("../helpers/AppError");
const auditLog = require("../helpers/auditLog.helper");
const {
  Event,
  EventCommittee,
  EventAssignment,
  EventProgramItem,
  EventBudget,
  EventBudgetItem,
  EventCashAdvance,
  EventLiquidation,
  EventLiquidationItem,
  EventApproval,
  EventRegistration,
  InventoryRequest,
  InventoryItem,
  Expense,
  ExpenseCategory,
  PaymentMethod,
  Member,
  Fund,
  Account,
} = require("../models");

const money = (v) => Math.round((Number(v) || 0) * 100) / 100;
const safeFind = (M, opts) => (M?.findAll ? M.findAll(opts).catch(() => []) : Promise.resolve([]));
const safeCount = (M, opts) => (M?.count ? M.count(opts).catch(() => 0) : Promise.resolve(0));

exports.getWorkspaceSummary = async () => {
  const [upcoming, ongoing, pendingBudgets, pendingLiquidations, activeAdvances] = await Promise.all([
    safeCount(Event, { where: { status: "Upcoming", is_deleted: 0 } }),
    safeCount(Event, { where: { status: "Ongoing", is_deleted: 0 } }),
    safeCount(EventBudget, { where: { status: "submitted", is_deleted: 0 } }),
    safeCount(EventLiquidation, { where: { status: "submitted", is_deleted: 0 } }),
    safeCount(EventCashAdvance, { where: { status: "released", is_deleted: 0 } }),
  ]);
  return {
    upcoming_events: upcoming,
    ongoing_events: ongoing,
    pending_budgets: pendingBudgets,
    pending_liquidations: pendingLiquidations,
    active_cash_advances: activeAdvances,
  };
};

exports.getEventWorkspace = async (eventId) => {
  const event = await Event.findByPk(eventId);
  if (!event) throw AppError.notFound("RECORD_NOT_FOUND", "Event not found");

  const [
    committees,
    assignments,
    program,
    budgets,
    cashAdvances,
    liquidations,
    inventoryRequests,
    postedExpenses,
    registrationsCount,
  ] = await Promise.all([
    safeFind(EventCommittee, {
      where: { event_id: event.id, is_deleted: 0 },
      include: [{ model: Member, as: "chair", attributes: ["id", "first_name", "last_name"], required: false }],
      order: [["name", "ASC"]],
    }),
    safeFind(EventAssignment, {
      where: { event_id: event.id, is_deleted: 0 },
      include: [
        { model: Member, as: "member", attributes: ["id", "first_name", "last_name", "phone"], required: false },
        { model: EventCommittee, as: "committee", attributes: ["id", "name"], required: false },
      ],
      order: [["id", "ASC"]],
    }),
    safeFind(EventProgramItem, {
      where: { event_id: event.id, is_deleted: 0 },
      order: [["sort_order", "ASC"], ["start_time", "ASC"]],
    }),
    safeFind(EventBudget, {
      where: { event_id: event.id, is_deleted: 0 },
      include: [
        { model: EventBudgetItem, as: "items", where: { is_deleted: 0 }, required: false },
        { model: Fund, as: "fund", attributes: ["id", "name"], required: false },
      ],
      order: [["id", "DESC"]],
    }),
    safeFind(EventCashAdvance, {
      where: { event_id: event.id, is_deleted: 0 },
      include: [
        { model: Account, as: "account", attributes: ["id", "name"], required: false },
        { model: Fund, as: "fund", attributes: ["id", "name"], required: false },
      ],
      order: [["id", "DESC"]],
    }),
    safeFind(EventLiquidation, {
      where: { event_id: event.id, is_deleted: 0 },
      include: [{ model: EventLiquidationItem, as: "items", where: { is_deleted: 0 }, required: false }],
      order: [["id", "DESC"]],
    }),
    safeFind(InventoryRequest, {
      where: { event_id: event.id },
      include: [{ model: InventoryItem, as: "item", attributes: ["id", "name", "unit"], required: false }],
      order: [["id", "DESC"]],
    }),
    safeFind(Expense, {
      where: { event_id: event.id, is_deleted: 0, status: "paid" },
      order: [["date", "DESC"]],
    }),
    safeCount(EventRegistration, { where: { event_id: event.id } }),
  ]);

  const approvedBudget = money(
    budgets.filter((b) => b.status === "approved").reduce((s, b) => s + money(b.total_approved ?? b.total_requested), 0)
  );
  const requestedBudget = money(budgets.reduce((s, b) => s + money(b.total_requested), 0));
  const releasedAdvances = money(
    cashAdvances.filter((a) => ["released", "liquidated"].includes(a.status)).reduce((s, a) => s + money(a.amount_released), 0)
  );
  const unliquidatedAdvances = money(
    cashAdvances.filter((a) => a.status === "released").reduce((s, a) => s + money(a.amount_released), 0)
  );
  const actualPostedSpent = money(postedExpenses.reduce((s, e) => s + money(e.amount), 0));
  const returnedCash = money(
    liquidations.filter((l) => l.status === "posted").reduce((s, l) => s + money(l.amount_returned), 0)
  );
  const reimbursementDue = money(
    liquidations.filter((l) => l.status === "posted").reduce((s, l) => s + money(l.amount_reimbursed), 0)
  );

  const checklist = [
    { key: "program", label: "Program schedule drafted", done: program.length > 0 },
    { key: "committees", label: "Committees & volunteers assigned", done: committees.length > 0 || assignments.length > 0 },
    { key: "budget", label: "Event budget approved", done: budgets.some((b) => b.status === "approved") },
    { key: "liquidation", label: "All released cash advances liquidated", done: cashAdvances.filter((a) => a.status === "released").length === 0 },
    { key: "completion", label: "Event marked Completed", done: event.status === "Completed" },
  ];

  return {
    event,
    registrations_count: registrationsCount,
    committees,
    assignments,
    program,
    budgets,
    cash_advances: cashAdvances,
    liquidations,
    inventory_requests: inventoryRequests,
    posted_expenses: postedExpenses,
    financial_summary: {
      requested_budget: requestedBudget,
      approved_budget: approvedBudget,
      cash_advanced: releasedAdvances,
      unliquidated_advances: unliquidatedAdvances,
      actual_posted_expenses: actualPostedSpent,
      variance: money(approvedBudget - actualPostedSpent),
      returned_cash: returnedCash,
      reimbursement_due: reimbursementDue,
    },
    checklist,
  };
};

// ── Committees & Assignments
exports.createCommittee = async (eventId, payload, user) => {
  const name = String(payload.name || "").trim();
  if (!name) throw AppError.badRequest("VALIDATION_ERROR", "Committee name is required.");
  const created = await EventCommittee.create({
    event_id: Number(eventId),
    name,
    chair_member_id: payload.chair_member_id || null,
    responsibilities: payload.responsibilities || null,
  });
  auditLog.log({ userId: user.userId, action: "CREATE_EVENT_COMMITTEE", targetTable: "event_committees", targetId: created.id });
  return created;
};

exports.createAssignment = async (eventId, payload, user) => {
  const roleTitle = String(payload.role_title || "").trim();
  if (!payload.member_id || !roleTitle) {
    throw AppError.badRequest("VALIDATION_ERROR", "Member and role title are required.");
  }
  const created = await EventAssignment.create({
    event_id: Number(eventId),
    committee_id: payload.committee_id || null,
    member_id: Number(payload.member_id),
    role_title: roleTitle,
    task_notes: payload.task_notes || null,
    status: "assigned",
  });
  auditLog.log({ userId: user.userId, action: "CREATE_EVENT_ASSIGNMENT", targetTable: "event_assignments", targetId: created.id });
  return created;
};

exports.updateAssignmentStatus = async (eventId, assignmentId, status, user) => {
  const allowed = ["assigned", "confirmed", "completed", "cancelled"];
  if (!allowed.includes(status)) throw AppError.badRequest("VALIDATION_ERROR", "Invalid assignment status.");
  const row = await EventAssignment.findOne({ where: { id: assignmentId, event_id: eventId, is_deleted: 0 } });
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Assignment not found");
  await row.update({ status });
  auditLog.log({ userId: user.userId, action: "UPDATE_EVENT_ASSIGNMENT", targetTable: "event_assignments", targetId: row.id });
  return row;
};

// ── Program Builder
exports.createProgramItem = async (eventId, payload, user) => {
  const title = String(payload.title || "").trim();
  if (!title) throw AppError.badRequest("VALIDATION_ERROR", "Program item title is required.");
  const created = await EventProgramItem.create({
    event_id: Number(eventId),
    sort_order: Number(payload.sort_order || 0),
    start_time: payload.start_time || null,
    end_time: payload.end_time || null,
    title,
    lead_person: payload.lead_person || null,
    notes: payload.notes || null,
  });
  auditLog.log({ userId: user.userId, action: "CREATE_EVENT_PROGRAM_ITEM", targetTable: "event_program_items", targetId: created.id });
  return created;
};

exports.archiveProgramItem = async (eventId, itemId) => {
  const row = await EventProgramItem.findOne({ where: { id: itemId, event_id: eventId, is_deleted: 0 } });
  if (!row) throw AppError.notFound("RECORD_NOT_FOUND", "Program item not found");
  await row.update({ is_deleted: 1 });
  return { id: row.id, archived: true };
};

// ── Budgets
exports.createBudget = async (eventId, payload, user) => {
  const title = String(payload.title || "Event Budget Proposal").trim();
  const items = Array.isArray(payload.items) ? payload.items : [];
  const totalFromItems = items.reduce((s, it) => s + money(it.estimated_amount ?? (Number(it.quantity || 1) * Number(it.unit_cost || 0))), 0);
  const totalRequested = money(payload.total_requested ?? totalFromItems);
  if (totalRequested <= 0) throw AppError.badRequest("VALIDATION_ERROR", "Budget total must be greater than zero.");

  const created = await sequelize.transaction(async (transaction) => {
    const budget = await EventBudget.create({
      event_id: Number(eventId),
      title,
      total_requested: totalRequested,
      fund_id: payload.fund_id || null,
      status: payload.submit_immediately ? "submitted" : "draft",
      submitted_by: user.userId,
      notes: payload.notes || null,
    }, { transaction });

    for (const it of items) {
      const qty = Number(it.quantity || 1);
      const unitCost = money(it.unit_cost || 0);
      const est = money(it.estimated_amount ?? qty * unitCost);
      await EventBudgetItem.create({
        budget_id: budget.id,
        category_name: String(it.category_name || "General").trim(),
        description: it.description || null,
        quantity: qty,
        unit_cost: unitCost,
        estimated_amount: est,
      }, { transaction });
    }
    return budget;
  });

  auditLog.log({ userId: user.userId, action: "CREATE_EVENT_BUDGET", targetTable: "event_budgets", targetId: created.id });
  return created;
};

exports.transitionBudget = async (eventId, budgetId, action, payload = {}, user) => {
  const budget = await EventBudget.findOne({ where: { id: budgetId, event_id: eventId, is_deleted: 0 } });
  if (!budget) throw AppError.notFound("RECORD_NOT_FOUND", "Budget proposal not found");

  if (action === "submit") {
    await budget.update({ status: "submitted", submitted_by: user.userId, rejection_reason: null });
  } else if (action === "approve") {
    const approvedAmount = payload.total_approved !== undefined ? money(payload.total_approved) : money(budget.total_requested);
    await budget.update({
      status: "approved",
      total_approved: approvedAmount,
      approved_by: user.userId,
      approved_at: new Date(),
      rejection_reason: null,
    });
  } else if (action === "reject") {
    const reason = String(payload.reason || "").trim();
    if (!reason) throw AppError.badRequest("VALIDATION_ERROR", "Rejection reason is required.");
    await budget.update({ status: "rejected", rejection_reason: reason });
  } else {
    throw AppError.badRequest("VALIDATION_ERROR", "Invalid budget action.");
  }

  await EventApproval.create({
    event_id: Number(eventId),
    entity_type: "budget",
    entity_id: budget.id,
    action,
    actor_user_id: user.userId,
    remarks: payload.reason || payload.remarks || null,
  }).catch(() => {});
  return budget;
};

// ── Cash Advances (Tracked immediately in Finance — NEVER posted as Expenses on release)
exports.createCashAdvance = async (eventId, payload, user) => {
  const amount = money(payload.amount_released);
  const recipientName = String(payload.recipient_name || "").trim();
  if (amount <= 0 || !recipientName) {
    throw AppError.badRequest("VALIDATION_ERROR", "Recipient name and positive advance amount are required.");
  }
  const created = await EventCashAdvance.create({
    event_id: Number(eventId),
    budget_id: payload.budget_id || null,
    recipient_member_id: payload.recipient_member_id || null,
    recipient_name: recipientName,
    amount_released: amount,
    release_date: payload.release_date || null,
    account_id: payload.account_id || null,
    fund_id: payload.fund_id || null,
    reference_number: payload.reference_number || null,
    status: "requested",
    notes: payload.notes || null,
  });
  auditLog.log({ userId: user.userId, action: "REQUEST_EVENT_CASH_ADVANCE", targetTable: "event_cash_advances", targetId: created.id });
  return created;
};

exports.releaseCashAdvance = async (eventId, advanceId, payload = {}, user) => {
  const adv = await EventCashAdvance.findOne({ where: { id: advanceId, event_id: eventId, is_deleted: 0 } });
  if (!adv) throw AppError.notFound("RECORD_NOT_FOUND", "Cash advance not found");
  if (!["requested", "approved"].includes(adv.status)) {
    throw AppError.badRequest("INVALID_STATE", `Cash advance is already '${adv.status}'.`);
  }
  await adv.update({
    status: "released",
    release_date: payload.release_date || adv.release_date || new Date().toISOString().slice(0, 10),
    reference_number: payload.reference_number || adv.reference_number || null,
    account_id: payload.account_id ? Number(payload.account_id) : adv.account_id,
    released_by: user.userId,
    released_at: new Date(),
  });
  await EventApproval.create({
    event_id: Number(eventId),
    entity_type: "cash_advance",
    entity_id: adv.id,
    action: "released",
    actor_user_id: user.userId,
    remarks: payload.reference_number || "Cash advance released (tracked as advance; not counted as expense until liquidated).",
  }).catch(() => {});
  return adv;
};

// ── Liquidations + Hybrid Posting (Zero Double-Counting!)
exports.createLiquidation = async (eventId, payload, user) => {
  const items = Array.isArray(payload.items) ? payload.items : [];
  if (items.length === 0) throw AppError.badRequest("VALIDATION_ERROR", "Add at least one itemized receipt expense to liquidate.");

  let totalAdvanced = money(payload.total_advanced || 0);
  if (payload.cash_advance_id) {
    const adv = await EventCashAdvance.findOne({ where: { id: payload.cash_advance_id, event_id: eventId, is_deleted: 0 } });
    if (adv) totalAdvanced = money(adv.amount_released);
  }
  const totalSpent = money(items.reduce((s, it) => s + money(it.amount), 0));
  const amountReturned = money(Math.max(0, totalAdvanced - totalSpent));
  const amountReimbursed = money(Math.max(0, totalSpent - totalAdvanced));

  const created = await sequelize.transaction(async (transaction) => {
    const liq = await EventLiquidation.create({
      event_id: Number(eventId),
      cash_advance_id: payload.cash_advance_id || null,
      total_advanced: totalAdvanced,
      total_spent: totalSpent,
      amount_returned: amountReturned,
      amount_reimbursed: amountReimbursed,
      status: payload.submit_immediately ? "submitted" : "draft",
      submitted_by: user.userId,
      notes: payload.notes || null,
    }, { transaction });

    for (const it of items) {
      await EventLiquidationItem.create({
        liquidation_id: liq.id,
        expense_category_id: it.expense_category_id || null,
        expense_date: it.expense_date || new Date().toISOString().slice(0, 10),
        vendor: it.vendor || null,
        description: String(it.description || "Event expense").trim(),
        receipt_number: it.receipt_number || null,
        amount: money(it.amount),
      }, { transaction });
    }
    return liq;
  });

  auditLog.log({ userId: user.userId, action: "CREATE_EVENT_LIQUIDATION", targetTable: "event_liquidations", targetId: created.id });
  return created;
};

// Hybrid Posting: Finance verifies receipts and posts each liquidation line ONCE to finalized Finance Expenses
exports.verifyAndPostLiquidation = async (eventId, liquidationId, payload = {}, user) => {
  const result = await sequelize.transaction(async (transaction) => {
    const liq = await EventLiquidation.findOne({
      where: { id: liquidationId, event_id: eventId, is_deleted: 0 },
      include: [{ model: EventLiquidationItem, as: "items", where: { is_deleted: 0 }, required: false }],
      transaction,
    });
    if (!liq) throw AppError.notFound("RECORD_NOT_FOUND", "Liquidation not found");
    if (liq.status === "posted") {
      throw AppError.conflict("ALREADY_POSTED", "This liquidation has already been posted to Finance (double-posting prevented).");
    }

    // Resolve default ExpenseCategory & PaymentMethod safely when an item omitted category
    const defaultCat = await ExpenseCategory.findOne({ transaction }).catch(() => null);
    const defaultPm = await PaymentMethod.findOne({ transaction }).catch(() => null);
    const fallbackCategoryId = Number(payload.default_category_id || defaultCat?.id || 1);
    const fallbackPaymentMethodId = Number(payload.payment_method_id || defaultPm?.id || 1);

    const linkedAdvance = liq.cash_advance_id
      ? await EventCashAdvance.findOne({ where: { id: liq.cash_advance_id, is_deleted: 0 }, transaction })
      : null;

    const postedIds = [];
    for (const item of liq.items || []) {
      if (item.posted_expense_id) continue; // Idempotency guard per line item!
      const exp = await Expense.create({
        transaction_number: `EXP-EVT-${eventId}-${item.id}`,
        category_id: Number(item.expense_category_id || fallbackCategoryId),
        payment_method_id: fallbackPaymentMethodId,
        fund_id: linkedAdvance?.fund_id || payload.fund_id || null,
        account_id: linkedAdvance?.account_id || payload.account_id || null,
        event_id: Number(eventId),
        liquidation_id: liq.id,
        date: item.expense_date,
        amount: money(item.amount),
        payee: item.vendor || "Event Vendor",
        description: `[Event Liquidation #${liq.id}] ${item.description}`,
        payment_reference: item.receipt_number || null,
        status: "paid",
        requested_by: liq.submitted_by || user.userId,
        approved_by: user.userId,
        approved_at: new Date(),
        paid_by: user.userId,
        paid_at: new Date(),
        created_by: user.userId,
      }, { transaction });
      await item.update({ posted_expense_id: exp.id }, { transaction });
      postedIds.push(exp.id);
    }

    // Mark cash advance liquidated so it is no longer an active open advance
    if (linkedAdvance && linkedAdvance.status !== "liquidated") {
      await linkedAdvance.update({ status: "liquidated" }, { transaction });
    }

    await liq.update({
      status: "posted",
      verified_by: user.userId,
      verified_at: new Date(),
      posted_at: new Date(),
      rejection_reason: null,
    }, { transaction });

    await EventApproval.create({
      event_id: Number(eventId),
      entity_type: "liquidation",
      entity_id: liq.id,
      action: "verified_and_posted",
      actor_user_id: user.userId,
      remarks: `Posted ${postedIds.length} expense line(s) to Finance. Returned: ${liq.amount_returned}, Reimbursed: ${liq.amount_reimbursed}`,
    }, { transaction }).catch(() => {});

    return { liquidation: liq, posted_expense_ids: postedIds };
  });

  auditLog.log({ userId: user.userId, action: "POST_EVENT_LIQUIDATION", targetTable: "event_liquidations", targetId: Number(liquidationId) });
  return result;
};

exports.rejectLiquidation = async (eventId, liquidationId, reason, user) => {
  const cleanReason = String(reason || "").trim();
  if (!cleanReason) throw AppError.badRequest("VALIDATION_ERROR", "Rejection reason is required.");
  const liq = await EventLiquidation.findOne({ where: { id: liquidationId, event_id: eventId, is_deleted: 0 } });
  if (!liq) throw AppError.notFound("RECORD_NOT_FOUND", "Liquidation not found");
  if (liq.status === "posted") throw AppError.badRequest("INVALID_STATE", "Posted liquidations cannot be rejected.");
  await liq.update({ status: "rejected", rejection_reason: cleanReason });
  return liq;
};

exports.getCompletionReport = async (eventId) => {
  const ws = await exports.getEventWorkspace(eventId);
  return {
    generated_at: new Date().toISOString(),
    event: {
      id: ws.event.id,
      title: ws.event.title,
      start_date: ws.event.start_date,
      end_date: ws.event.end_date,
      location: ws.event.location,
      status: ws.event.status,
      capacity: ws.event.capacity,
      expected_participants: ws.event.expected_participants,
    },
    participation: {
      registered_count: ws.registrations_count,
      committees_count: ws.committees.length,
      volunteers_assigned: ws.assignments.length,
      program_items_count: ws.program.length,
    },
    finance: ws.financial_summary,
    checklist: ws.checklist,
  };
};
