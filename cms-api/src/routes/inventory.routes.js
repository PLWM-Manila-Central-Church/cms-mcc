"use strict";

const router = require("express").Router();
const ctrl   = require("../controllers/inventory.controller");
const auth   = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

// ── Items ────────────────────────────────────────────────────
router.get("/items",        auth, authorize("inventory", "read"),   ctrl.getAllItems);
router.get("/items/:id",    auth, authorize("inventory", "read"),   ctrl.getItemById);
router.post("/items",       auth, authorize("inventory", "create"), ctrl.createItem);
router.put("/items/:id",    auth, authorize("inventory", "update"), ctrl.updateItem);
router.delete("/items/:id", auth, authorize("inventory", "delete"), ctrl.deleteItem);

// ── Categories ───────────────────────────────────────────────
router.get("/categories",        auth, authorize("inventory", "read"),   ctrl.getAllCategories);
router.get("/categories/:id",    auth, authorize("inventory", "read"),   ctrl.getCategoryById);
router.post("/categories",       auth, authorize("inventory", "create"), ctrl.createCategory);
router.put("/categories/:id",    auth, authorize("inventory", "update"), ctrl.updateCategory);
router.delete("/categories/:id", auth, authorize("inventory", "delete"), ctrl.deleteCategory);

// ── Requests ─────────────────────────────────────────────────
// Static paths MUST come before /:id to avoid shadowing
router.get("/requests/mine", auth, authorize("inventory", "read"), ctrl.getMyRequests);
router.get("/requests/all",  auth, authorize("inventory", "read"), ctrl.getAllRequestsPaginated);
router.get("/requests",      auth, authorize("inventory", "read"), ctrl.getAllRequests);
router.get("/requests/:id",  auth, authorize("inventory", "read"), ctrl.getRequestById);

// FIX BUG 3: was authorize("inventory", "create") which blocked Registration Team
// (role_id 3) who only has inventory:read. Submitting a request does not create or
// modify any stock — it is semantically a read-level action.
router.post("/requests",                   auth, authorize("inventory", "read"),   ctrl.createRequest);
router.put("/requests/:id/review",         auth, authorize("inventory", "update"), ctrl.reviewRequest);
router.patch("/requests/:id/review",       auth, authorize("inventory", "update"), ctrl.reviewRequest);
router.delete("/requests/:id",             auth, authorize("inventory", "delete"), ctrl.deleteRequest);

// ── Usage ────────────────────────────────────────────────────
router.get("/usage",        auth, authorize("inventory", "read"),   ctrl.getAllUsage);
router.post("/usage",       auth, authorize("inventory", "create"), ctrl.createUsage);
router.delete("/usage/:id", auth, authorize("inventory", "delete"), ctrl.deleteUsage);

// ── Root aliases (frontend calls /inventory directly) ────────
router.get("/",    auth, authorize("inventory", "read"),   ctrl.getAllItems);
router.get("/:id", auth, authorize("inventory", "read"),   ctrl.getItemById);
router.post("/",   auth, authorize("inventory", "create"), ctrl.createItem);
router.put("/:id", auth, authorize("inventory", "update"), ctrl.updateItem);
router.delete("/:id", auth, authorize("inventory", "delete"), ctrl.deleteItem);

module.exports = router;
