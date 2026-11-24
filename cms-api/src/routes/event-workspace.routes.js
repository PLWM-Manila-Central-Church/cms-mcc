"use strict";

const router = require("express").Router();
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const permissionCache = require("../helpers/permissionCache.helper");
const svc = require("../services/eventWorkspace.service");

const canReadFinance = async (user) => {
  if (!user) return false;
  if (user.roleName === "System Admin") return true;
  if (!user.roleId) return false;
  const perms = await permissionCache.get(user.roleId);
  return perms.has("finance:read");
};

router.get("/workspace-summary", auth, authorize("events", "read"), async (req, res, next) => {
  try {
    const data = await svc.getWorkspaceSummary();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.get("/:id/workspace", auth, authorize("events", "read"), async (req, res, next) => {
  try {
    const data = await svc.getEventWorkspace(req.params.id);
    if (!(await canReadFinance(req.user))) {
      return res.json({
        success: true,
        data: {
          ...data,
          budgets: [],
          cash_advances: [],
          liquidations: [],
          finance_redacted: true,
        },
      });
    }
    res.json({ success: true, data: { ...data, finance_redacted: false } });
  } catch (err) { next(err); }
});

router.get("/:id/completion-report", auth, authorize("events", "read"), async (req, res, next) => {
  try {
    const data = await svc.getCompletionReport(req.params.id);
    if (!(await canReadFinance(req.user)) && data && typeof data === "object") {
      return res.json({
        success: true,
        data: {
          ...data,
          budget_approved: null,
          cash_advanced: null,
          total_spent: null,
          finance_redacted: true,
        },
      });
    }
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/committees", auth, authorize("events", "update"), async (req, res, next) => {
  try {
    const data = await svc.createCommittee(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/assignments", auth, authorize("events", "update"), async (req, res, next) => {
  try {
    const data = await svc.createAssignment(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.patch("/:id/assignments/:assignId/status", auth, authorize("events", "update"), async (req, res, next) => {
  try {
    const data = await svc.updateAssignmentStatus(req.params.id, req.params.assignId, req.body.status, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/program", auth, authorize("events", "update"), async (req, res, next) => {
  try {
    const data = await svc.createProgramItem(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/program/:itemId/archive", auth, authorize("events", "update"), async (req, res, next) => {
  try {
    const data = await svc.archiveProgramItem(req.params.id, req.params.itemId);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/budgets", auth, authorize("events", "update"), async (req, res, next) => {
  try {
    const data = await svc.createBudget(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

for (const action of ["submit", "approve", "reject"]) {
  const moduleName = action === "submit" ? "events" : "finance";
  router.post(`/:id/budgets/:budgetId/${action}`, auth, authorize(moduleName, "update"), async (req, res, next) => {
    try {
      const data = await svc.transitionBudget(req.params.id, req.params.budgetId, action, req.body, req.user);
      res.json({ success: true, data });
    } catch (err) { next(err); }
  });
}

router.post("/:id/cash-advances", auth, authorize("events", "update"), async (req, res, next) => {
  try {
    const data = await svc.createCashAdvance(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/cash-advances/:advId/release", auth, authorize("finance", "update"), async (req, res, next) => {
  try {
    const data = await svc.releaseCashAdvance(req.params.id, req.params.advId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/liquidations", auth, authorize("events", "update"), async (req, res, next) => {
  try {
    const data = await svc.createLiquidation(req.params.id, req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/liquidations/:liqId/verify-and-post", auth, authorize("finance", "update"), async (req, res, next) => {
  try {
    const data = await svc.verifyAndPostLiquidation(req.params.id, req.params.liqId, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

router.post("/:id/liquidations/:liqId/reject", auth, authorize("finance", "update"), async (req, res, next) => {
  try {
    const data = await svc.rejectLiquidation(req.params.id, req.params.liqId, req.body.reason, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

module.exports = router;
