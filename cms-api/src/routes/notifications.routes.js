"use strict";

const router = require("express").Router();
const ctrl   = require("../controllers/notifications.controller");
const auth   = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

// All notifications are scoped to the logged-in user

router.get("/",        auth, ctrl.getUserNotifications);
router.get("/unread",  auth, ctrl.getUnreadNotifications);

// FIX BUG 2 & 13: static paths MUST come before dynamic /:id routes.
// Previously /read-all and /clear-all were AFTER /:id/read and /:id,
// so Express matched them as id="read-all" / id="clear-all" → 404 every time.
router.patch("/read-all",  auth, ctrl.markAllAsRead);       // ← moved BEFORE /:id/read
router.delete("/clear-all", auth, ctrl.deleteAllNotifications); // ← moved BEFORE /:id

router.get("/:id",       auth, ctrl.getNotificationById);
router.post("/",         auth, authorize("notifications", "create"), ctrl.createNotification);
router.patch("/:id/read", auth, ctrl.markAsRead);
router.delete("/:id",    auth, ctrl.deleteNotification);

module.exports = router;
