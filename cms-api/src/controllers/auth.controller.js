"use strict";

const authService = require("../services/auth.service");

const cookieOpts = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path: "/",
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip     = req.ip || req.headers["x-forwarded-for"] || null;
    const device = req.headers["user-agent"] || null;
    const data   = await authService.login(email, password, ip, device);

    // Set httpOnly cookies for tokens
    res.cookie("accessToken",  data.accessToken,  { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", data.refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

    // User and permissions are returned in the response body — no need for non-httpOnly cookies
    // (exposing them to JS via cookies increases XSS attack surface)
    res.json({
      success: true,
      data: {
        user: data.user,
        permissions: data.permissions,
        forcePasswordChange: data.forcePasswordChange,
      },
    });
  } catch (err) {
    next(err);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies?.refreshToken || req.body?.refresh_token;
    const data = await authService.refreshToken(refreshToken);

    // Set new cookies
    res.cookie("accessToken",  data.accessToken,  { ...cookieOpts, maxAge: 15 * 60 * 1000 });
    res.cookie("refreshToken", data.refreshToken, { ...cookieOpts, maxAge: 7 * 24 * 60 * 60 * 1000 });

    res.json({ success: true, data: { message: "Token refreshed" } });
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
    const refreshToken = req.cookies?.refreshToken || req.body?.refresh_token;
    const data = await authService.logout(req.user.userId, refreshToken);

    // Clear auth cookies
    res.clearCookie("accessToken",  { ...cookieOpts });
    res.clearCookie("refreshToken", { ...cookieOpts });

    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};