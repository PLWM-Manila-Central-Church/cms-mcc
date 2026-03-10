"use strict";

const authService = require("../services/auth.service");

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip     = req.ip || req.headers["x-forwarded-for"] || null;
    const device = req.headers["user-agent"] || null;
    const data   = await authService.login(email, password, ip, device);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    const data = await authService.refreshToken(refresh_token);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const data = await authService.forgotPassword(email);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { token, new_password } = req.body;
    const data = await authService.resetPassword(token, new_password);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.changePassword = async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    const data = await authService.changePassword(req.user.userId, current_password, new_password);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { refresh_token } = req.body;
    const data = await authService.logout(req.user.userId, refresh_token);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};