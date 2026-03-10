"use strict";

const notificationsService = require("../services/notifications.service");

exports.getUserNotifications = async (req, res, next) => {
  try {
    const data = await notificationsService.getUserNotifications(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getUnreadNotifications = async (req, res, next) => {
  try {
    const data = await notificationsService.getUnreadNotifications(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getNotificationById = async (req, res, next) => {
  try {
    const data = await notificationsService.getNotificationById(req.params.id, req.user.userId);
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
    const data = await notificationsService.markAsRead(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.markAllAsRead = async (req, res, next) => {
  try {
    const data = await notificationsService.markAllAsRead(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteNotification = async (req, res, next) => {
  try {
    const data = await notificationsService.deleteNotification(req.params.id, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteAllNotifications = async (req, res, next) => {
  try {
    const data = await notificationsService.deleteAllNotifications(req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
