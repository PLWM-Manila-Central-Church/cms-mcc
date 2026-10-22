"use strict";

const { Op } = require("sequelize");
const { Notification, User, SystemSetting } = require("../models");
const AppError = require("../helpers/AppError");
const logger = require("../helpers/logger");
const mailer = require("../utils/mailer");

const deliverNotificationEmails = async (userIds, message) => {
  if (process.env.EMAIL_NOTIFICATION_DELIVERY_ENABLED !== "true") return;
  if (!process.env.BREVO_API_KEY || !process.env.SMTP_FROM) return;

  try {
    const preference = await SystemSetting.findOne({
      where: { key: "email_notifications" },
      attributes: ["value"],
    });
    if (!/^(true|1|yes)$/i.test(String(preference?.value || ""))) return;

    const ids = [...new Set((userIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0))];
    if (!ids.length) return;
    const recipients = await User.findAll({
      where: { id: { [Op.in]: ids }, is_active: 1, is_deleted: 0 },
      attributes: ["id", "email"],
    });

    // Keep provider concurrency bounded when a broadcast reaches many accounts.
    for (let offset = 0; offset < recipients.length; offset += 5) {
      const batch = recipients.slice(offset, offset + 5).filter((recipient) => recipient.email);
      const results = await Promise.allSettled(batch.map((recipient) => mailer.sendNotification({
        to: recipient.email,
        message,
      })));
      const failed = results.filter((result) => result.status === "rejected").length;
      if (failed) logger.error(new Error(`${failed} notification email(s) failed`), "Notification email delivery failed");
    }
  } catch (error) {
    logger.error(error, "Notification email delivery failed");
  }
};

// Historic operational inventory broadcasts remain stored, but unrelated Members
// no longer receive or see them. Request-specific notices use different types.
const notificationScope = (userId, roleName) => ({
  user_id: userId,
  ...(roleName === "Member" ? { type: { [Op.notIn]: [
    "inventory_item_low_stock", "inventory_item_out_of_stock",
    "inventory_item_under_repair", "inventory_item_available",
  ] } } : {}),
});

// ── Get All Notifications for User ──────────────────────────
exports.getUserNotifications = async (userId, roleName) => {
  return await Notification.findAll({
    where: notificationScope(userId, roleName),
    order: [["created_at", "DESC"]],
  });
};

// ── Get Unread Notifications for User ───────────────────────
exports.getUnreadNotifications = async (userId, roleName) => {
  return await Notification.findAll({
    where: { ...notificationScope(userId, roleName), is_read: 0 },
    order: [["created_at", "DESC"]],
  });
};

// ── Get Notification By ID ───────────────────────────────────
exports.getNotificationById = async (id, userId, roleName) => {
  const notification = await Notification.findOne({
    where: { ...notificationScope(userId, roleName), id },
  });
  if (!notification) throw AppError.notFound("RECORD_NOT_FOUND", "Notification not found");
  return notification;
};

// ── Create Notification ──────────────────────────────────────
exports.createNotification = async (data) => {
  const { user_id, type, message, reference_id = null, reference_type = null } = data;
  const notification = await Notification.create({
    user_id,
    type,
    message,
    is_read: 0,
    read_at: null,
    reference_id,
    reference_type,
  });
  await deliverNotificationEmails([user_id], message);
  return notification;
};

// ── Bulk Create Notifications ────────────────────────────────
// Used for broadcast notifications (event/service publish).
// Accepts an array of user IDs and a shared payload.
exports.bulkCreateNotifications = async (
  userIds,
  { type, message, reference_id = null, reference_type = null },
) => {
  if (!userIds || userIds.length === 0) return;
  const now = new Date();
  const records = userIds.map((uid) => ({
    user_id:        uid,
    type,
    message,
    is_read:        0,
    read_at:        null,
    reference_id,
    reference_type,
    created_at:     now,
  }));
  const notifications = await Notification.bulkCreate(records, { ignoreDuplicates: true });
  await deliverNotificationEmails(userIds, message);
  return notifications;
};

exports.notifyAttendanceRecorded = async ({ memberId, activityType, activityId, activityTitle }) => {
  try {
    const users = await User.findAll({ where: { member_id: memberId, is_active: 1, is_deleted: 0 }, attributes: ["id"] });
    const label = activityType === "event" ? "event" : "service";
    await exports.bulkCreateNotifications(users.map((user) => user.id), {
      type: `attendance_${label}_recorded`,
      message: `Your attendance was recorded for ${activityTitle || `this ${label}`}.`,
      reference_id: activityId,
      reference_type: label,
    });
  } catch (error) {
    logger.error(error, "Attendance notification failed");
  }
};

// ── Mark Notification as Read ────────────────────────────────
exports.markAsRead = async (id, userId, roleName) => {
  const notification = await Notification.findOne({
    where: { ...notificationScope(userId, roleName), id },
  });
  if (!notification) throw AppError.notFound("RECORD_NOT_FOUND", "Notification not found");

  // FIX BUG 3: was throwing 400 if already read, causing race-condition failures.
  // Now it's a no-op — if already read, just return it unchanged.
  if (!notification.is_read) {
    await notification.update({ is_read: 1, read_at: new Date() });
  }

  return notification;
};

// ── Mark All as Read ─────────────────────────────────────────
exports.markAllAsRead = async (userId, roleName) => {
  await Notification.update(
    { is_read: 1, read_at: new Date() },
    { where: { ...notificationScope(userId, roleName), is_read: 0 } },
  );
  return { message: "All notifications marked as read." };
};

// ── Archive Notification ────────────────────────────────────
exports.archiveNotification = async (id, userId, roleName) => {
  const notification = await Notification.findOne({
    where: { ...notificationScope(userId, roleName), id },
  });
  if (!notification) throw AppError.notFound("RECORD_NOT_FOUND", "Notification not found");
  await notification.update({ is_deleted: 1, deleted_at: new Date(), deleted_by: userId });
  return { message: "Notification archived. It can be restored by a System Admin from Archives." };
};

// ── Archive All Notifications for User ──────────────────────
exports.archiveAllNotifications = async (userId, roleName) => {
  await Notification.update(
    { is_deleted: 1, deleted_at: new Date(), deleted_by: userId },
    { where: notificationScope(userId, roleName) },
  );
  return { message: "Notifications archived. A System Admin can restore them from Archives." };
};
