"use strict";

const router    = require("express").Router();
const ctrl      = require("../controllers/inventory.controller");
const auth      = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");
const validate  = require("../middlewares/validate");
const {
  createItemSchema, updateItemSchema,
  createRequestSchema, reviewRequestSchema,
  createUsageSchema,
  createCategorySchema, updateCategorySchema,
} = require("../validators/inventory.validator");

// ── Items ────────────────────────────────────────────────────
router.get("/items",        auth, authorize("inventory", "read"),   ctrl.getAllItems);
router.get("/items/:id",    auth, authorize("inventory", "read"),   ctrl.getItemById);
router.post("/items",       auth, authorize("inventory", "create"), validate(createItemSchema), ctrl.createItem);
router.put("/items/:id",    auth, authorize("inventory", "update"), validate(updateItemSchema), ctrl.updateItem);
router.delete("/items/:id", auth, authorize("inventory", "delete"), ctrl.deleteItem);

// ── Categories ───────────────────────────────────────────────
router.get("/categories",        auth, authorize("inventory", "read"),   ctrl.getAllCategories);
router.get("/categories/:id",    auth, authorize("inventory", "read"),   ctrl.getCategoryById);
router.post("/categories",       auth, authorize("inventory", "create"), validate(createCategorySchema), ctrl.createCategory);
router.put("/categories/:id",    auth, authorize("inventory", "update"), validate(updateCategorySchema), ctrl.updateCategory);
router.delete("/categories/:id", auth, authorize("inventory", "delete"), ctrl.deleteCategory);

// ── Requests — static paths MUST come before /:id ────────────
router.get("/requests/mine", auth, authorize("inventory", "read"), ctrl.getMyRequests);
router.get("/requests/all",  auth, authorize("inventory", "read"), ctrl.getAllRequestsPaginated);
router.get("/requests",      auth, authorize("inventory", "read"), ctrl.getAllRequests);
router.get("/requests/:id",  auth, authorize("inventory", "read"), ctrl.getRequestById);
router.post("/requests",                   auth, authorize("inventory", "read"),   validate(createRequestSchema), ctrl.createRequest);
router.put("/requests/:id/review",         auth, authorize("inventory", "update"), validate(reviewRequestSchema), ctrl.reviewRequest);
router.patch("/requests/:id/review",       auth, authorize("inventory", "update"), validate(reviewRequestSchema), ctrl.reviewRequest);
router.delete("/requests/:id",             auth, authorize("inventory", "delete"), ctrl.deleteRequest);

// ── Usage ────────────────────────────────────────────────────
router.get("/usage",        auth, authorize("inventory", "read"),   ctrl.getAllUsage);
router.post("/usage",       auth, authorize("inventory", "create"), validate(createUsageSchema), ctrl.createUsage);
router.delete("/usage/:id", auth, authorize("inventory", "delete"), ctrl.deleteUsage);

module.exports = router;
