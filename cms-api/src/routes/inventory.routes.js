"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/inventory.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

// ── Items ────────────────────────────────────────────────────
router.get("/items",     auth, authorize("inventory", "read"),   ctrl.getAllItems);
router.get("/items/:id", auth, authorize("inventory", "read"),   ctrl.getItemById);
router.post("/items",    auth, authorize("inventory", "create"), ctrl.createItem);
router.put("/items/:id", auth, authorize("inventory", "update"), ctrl.updateItem);
router.delete("/items/:id", auth, authorize("inventory", "delete"), ctrl.deleteItem);

// ── Categories ───────────────────────────────────────────────
router.get("/categories",     auth, authorize("inventory", "read"),   ctrl.getAllCategories);
router.get("/categories/:id", auth, authorize("inventory", "read"),   ctrl.getCategoryById);
router.post("/categories",    auth, authorize("inventory", "create"), ctrl.createCategory);
router.put("/categories/:id", auth, authorize("inventory", "update"), ctrl.updateCategory);
router.delete("/categories/:id", auth, authorize("inventory", "delete"), ctrl.deleteCategory);

// ── Requests (mine and all MUST be before :id) ───────────────
router.get("/requests/mine", auth, authorize("inventory", "read"),   ctrl.getMyRequests);
router.get("/requests/all",  auth, authorize("inventory", "manage"), ctrl.getAllRequestsPaginated);
router.get("/requests",      auth, authorize("inventory", "read"),   ctrl.getAllRequests);
router.get("/requests/:id",        auth, authorize("inventory", "read"),   ctrl.getRequestById);
router.post("/requests",           auth, authorize("inventory", "create"), ctrl.createRequest);
router.put("/requests/:id/review", auth, authorize("inventory", "update"), ctrl.reviewRequest);
router.delete("/requests/:id",     auth, authorize("inventory", "delete"), ctrl.deleteRequest);

// ── Usage ────────────────────────────────────────────────────
router.get("/usage",     auth, authorize("inventory", "read"),   ctrl.getAllUsage);
router.post("/usage",    auth, authorize("inventory", "create"), ctrl.createUsage);
router.delete("/usage/:id", auth, authorize("inventory", "delete"), ctrl.deleteUsage);

// ── Root aliases (frontend compatibility) ────────────────────
router.get("/",    auth, authorize("inventory", "read"),   ctrl.getAllItems);
router.get("/:id", auth, authorize("inventory", "read"),   ctrl.getItemById);
router.post("/",   auth, authorize("inventory", "create"), ctrl.createItem);
router.put("/:id", auth, authorize("inventory", "update"), ctrl.updateItem);
router.delete("/:id", auth, authorize("inventory", "delete"), ctrl.deleteItem);

module.exports = router;