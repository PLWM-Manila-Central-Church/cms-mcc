"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/inventory.controller");
const invUpgrade = require("../services/inventoryUpgrade.service");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const validateQuery = require("../middlewares/validateQuery");
const {
  createItemSchema, updateItemSchema,
  createRequestSchema, reviewRequestSchema,
  createUsageSchema,
  createCategorySchema, updateCategorySchema,
  getItemsQuerySchema, getRequestsQuerySchema, getUsageQuerySchema,
} = require("../validators/inventory.validator");

const { getScope } = require("../helpers/scopedLeader.helper");

const guardInventoryRequestCreate = (req, res, next) => {
  if (req.user?.roleName === "Pastor") {
    return res.status(403).json({ success: false, message: "Pastor has read-only access to inventory." });
  }
  if (req.user?.roleName === "Leader") {
    const scope = getScope(req.user);
    if (!scope || scope.type === "all") {
      return res.status(403).json({ success: false, message: "Select a single assigned team before submitting an inventory request." });
    }
  }
  return next();
};

// ── Items ────────────────────────────────────────────────────
router.get("/items/options", auth, authorize("inventory", "read"), async (req, res, next) => {
  try {
    const data = await invUpgrade.listItemOptions(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.get("/items",        auth, authorize("inventory", "read"), validateQuery(getItemsQuerySchema), ctrl.getAllItems);
router.get("/reports", auth, authorize("inventory", "read"), ctrl.getInventoryReport);
router.get("/reports/export.csv", auth, authorize("inventory", "read"), ctrl.exportInventoryReport);
router.get("/items/:id",    auth, authorize("inventory", "read"),   ctrl.getItemById);
router.post("/items",       auth, authorize("inventory", "create"), validate(createItemSchema), ctrl.createItem);
router.put("/items/:id",    auth, authorize("inventory", "update"), validate(updateItemSchema), ctrl.updateItem);
router.patch("/items/:id/archive", auth, authorize("inventory", "delete"), ctrl.archiveItem);

// ── Categories ───────────────────────────────────────────────
router.get("/request-contexts", auth, authorize("inventory", "read"), ctrl.getRequestContexts);
router.get("/categories",        auth, authorize("inventory", "read"),   ctrl.getAllCategories);
router.get("/categories/:id",    auth, authorize("inventory", "read"),   ctrl.getCategoryById);
router.post("/categories",       auth, authorize("inventory", "create"), validate(createCategorySchema), ctrl.createCategory);
router.put("/categories/:id",    auth, authorize("inventory", "update"), validate(updateCategorySchema), ctrl.updateCategory);

// ── Requests — static paths MUST come before /:id ────────────
router.get("/requests/mine", auth, authorize("inventory", "read"), ctrl.getMyRequests);
router.get("/requests/all",  auth, authorize("inventory", "read"), validateQuery(getRequestsQuerySchema), ctrl.getAllRequestsPaginated);
router.get("/requests",      auth, authorize("inventory", "read"), ctrl.getAllRequests);
router.get("/requests/:id",  auth, authorize("inventory", "read"), ctrl.getRequestById);
router.post("/requests",                   auth, authorize("inventory", "read"), guardInventoryRequestCreate, validate(createRequestSchema), ctrl.createRequest);
router.put("/requests/:id/review",         auth, authorize("inventory", "update"), validate(reviewRequestSchema), ctrl.reviewRequest);
router.patch("/requests/:id/review",       auth, authorize("inventory", "update"), validate(reviewRequestSchema), ctrl.reviewRequest);

// ── Phase 7: Authoritative Stock Ledger, Borrowing, Maintenance & Extended Reports ──
router.get("/transactions", auth, authorize("inventory", "read"), async (req, res, next) => {
  try {
    const data = await invUpgrade.listTransactions(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/transactions", auth, authorize("inventory", "update"), async (req, res, next) => {
  try {
    const data = await invUpgrade.recordStockMovement(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});
router.get("/borrowings", auth, authorize("inventory", "read"), async (req, res, next) => {
  try {
    const data = await invUpgrade.listBorrowings(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/borrowings", auth, authorize("inventory", "update"), async (req, res, next) => {
  try {
    const data = await invUpgrade.createBorrowing(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/borrowings/:id/return", auth, authorize("inventory", "update"), async (req, res, next) => {
  try {
    const data = await invUpgrade.returnBorrowing(req.params.id, req.body, req.user);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.get("/maintenance", auth, authorize("inventory", "read"), async (req, res, next) => {
  try {
    const data = await invUpgrade.listMaintenance(req.query);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/maintenance", auth, authorize("inventory", "update"), async (req, res, next) => {
  try {
    const data = await invUpgrade.createMaintenance(req.body, req.user);
    res.status(201).json({ success: true, data });
  } catch (err) { next(err); }
});
router.post("/maintenance/:id/complete", auth, authorize("inventory", "update"), async (req, res, next) => {
  try {
    const data = await invUpgrade.completeMaintenance(req.params.id);
    res.json({ success: true, data });
  } catch (err) { next(err); }
});
router.get("/reports/extended", auth, authorize("inventory", "read"), async (req, res, next) => {
  try {
    const data = await invUpgrade.getExtendedReports();
    res.json({ success: true, data });
  } catch (err) { next(err); }
});

// ── Usage ────────────────────────────────────────────────────
router.get("/usage",        auth, authorize("inventory", "read"), validateQuery(getUsageQuerySchema), ctrl.getAllUsage);
router.post("/usage",       auth, authorize("inventory", "create"), validate(createUsageSchema), ctrl.createUsage);
router.post("/usage/:id/reverse", auth, authorize("inventory", "delete"), ctrl.reverseUsage);

module.exports = router;
