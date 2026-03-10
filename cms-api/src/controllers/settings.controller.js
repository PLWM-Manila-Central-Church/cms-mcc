"use strict";

const settingsService = require("../services/settings.service");

exports.getAllSettings = async (req, res, next) => {
  try {
    const data = await settingsService.getAllSettings();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.getSettingByKey = async (req, res, next) => {
  try {
    const data = await settingsService.getSettingByKey(req.params.key);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.createSetting = async (req, res, next) => {
  try {
    const data = await settingsService.createSetting(req.body, req.user.userId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.updateSetting = async (req, res, next) => {
  try {
    const { value } = req.body;
    const data = await settingsService.updateSetting(req.params.key, value, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PUT /settings/bulk  — body: { settings: [{ key, value }] }
exports.bulkUpdateSettings = async (req, res, next) => {
  try {
    const { settings } = req.body;
    const data = await settingsService.bulkUpdateSettings(settings, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

// PUT /settings  — body: { church_name: "...", currency: "..." }
// This is what the frontend SettingsPage actually calls.
exports.bulkUpdateFromObject = async (req, res, next) => {
  try {
    const data = await settingsService.bulkUpdateFromObject(req.body, req.user.userId);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.deleteSetting = async (req, res, next) => {
  try {
    const data = await settingsService.deleteSetting(req.params.key);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};
