"use strict";

const { Notification } = require("../models");

// ── Get All Notifications for User ──────────────────────────
exports.getUserNotifications = async (userId) => {
  return await Notification.findAll({
    where: { user_id: userId },
    order: [["created_at", "DESC"]],
  });
};

// ── Get Unread Notifications for User ───────────────────────
exports.getUnreadNotifications = async (userId) => {
  return await Notification.findAll({
    where: { user_id: userId, is_read: 0 },
    order: [["created_at", "DESC"]],
  });
};

// ── Get Notification By ID ───────────────────────────────────
exports.getNotificationById = async (id, userId) => {
  const notification = await Notification.findOne({
    where: { id, user_id: userId },
  });
  if (!notification) throw { status: 404, message: "Notification not found" };
  return notification;
};

// ── Create Notification ──────────────────────────────────────
exports.createNotification = async (data) => {
  const { user_id, type, message } = data;
  return await Notification.create({
    user_id,
    type,
    message,
    is_read: 0,
    read_at: null,
  });
};

// ── Mark Notification as Read ────────────────────────────────
exports.markAsRead = async (id, userId) => {
  const notification = await Notification.findOne({
    where: { id, user_id: userId },
  });
  if (!notification) throw { status: 404, message: "Notification not found" };

  // FIX BUG 3: was throwing 400 if already read, causing race-condition failures.
  // Now it's a no-op — if already read, just return it unchanged.
  if (!notification.is_read) {
    await notification.update({ is_read: 1, read_at: new Date() });
  }

  return notification;
};

// ── Mark All as Read ─────────────────────────────────────────
exports.markAllAsRead = async (userId) => {
  await Notification.update(
    { is_read: 1, read_at: new Date() },
    { where: { user_id: userId, is_read: 0 } },
  );
  return { message: "All notifications marked as read." };
};

// ── Delete Notification ──────────────────────────────────────
exports.deleteNotification = async (id, userId) => {
  const notification = await Notification.findOne({
    where: { id, user_id: userId },
  });
  if (!notification) throw { status: 404, message: "Notification not found" };
  await notification.destroy();
  return { message: "Notification deleted successfully." };
};

// ── Delete All Notifications for User ───────────────────────
exports.deleteAllNotifications = async (userId) => {
  await Notification.destroy({ where: { user_id: userId } });
  return { message: "All notifications deleted successfully." };
};
