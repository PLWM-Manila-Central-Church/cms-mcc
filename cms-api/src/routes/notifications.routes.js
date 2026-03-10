"use strict";

const router = require("express").Router();
const ctrl = require("../controllers/notifications.controller");
const auth = require("../middlewares/verifyToken");
const authorize = require("../middlewares/authorize");

// All notifications are scoped to the logged-in user
router.get("/", auth, ctrl.getUserNotifications);
router.get("/unread", auth, ctrl.getUnreadNotifications);
router.get("/:id", auth, ctrl.getNotificationById);
router.post(
  "/",
  auth,
  authorize("notifications", "create"),
  ctrl.createNotification,
);
router.patch("/:id/read", auth, ctrl.markAsRead);
router.patch("/read-all", auth, ctrl.markAllAsRead);
router.delete("/clear-all", auth, ctrl.deleteAllNotifications);
router.delete("/:id", auth, ctrl.deleteNotification);

module.exports = router;
