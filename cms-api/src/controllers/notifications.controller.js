"use strict";

const notificationsService = require("../services/notifications.service");

exports.getUserNotifications = async (req, res, next) => {
  try {
    const data = await notificationsService.getUserNotifications(req.user.userId, req.user.roleName);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getUnreadNotifications = async (req, res, next) => {
  try {
    const data = await notificationsService.getUnreadNotifications(req.user.userId, req.user.roleName);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getNotificationById = async (req, res, next) => {
  try {
    const data = await notificationsService.getNotificationById(req.params.id, req.user.userId, req.user.roleName);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createNotification = async (req, res, next) => {
  try {
    const data = await notificationsService.createNotification(req.body);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.markAsRead = async (req, res, next) => {
  try {
    const data = await notificationsService.markAsRead(req.params.id, req.user.userId, req.user.roleName);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const data = await notificationsService.markAllAsRead(req.user.userId, req.user.roleName);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.archiveNotification = async (req, res, next) => {
  try {
    const data = await notificationsService.archiveNotification(req.params.id, req.user.userId, req.user.roleName);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.archiveAllNotifications = async (req, res, next) => {
  try {
    const data = await notificationsService.archiveAllNotifications(req.user.userId, req.user.roleName);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
