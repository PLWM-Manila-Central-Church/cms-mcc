"use strict";

const router   = require("express").Router();
const ctrl     = require("../controllers/auth.controller");
const auth     = require("../middlewares/verifyToken");
const validate = require("../middlewares/validate");
const {
  loginSchema,
  refreshTokenSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  changePasswordSchema,
  logoutSchema,
} = require("../validators/auth.validator");

// Fix #1 — validate request bodies on every auth endpoint
router.post("/login",           validate(loginSchema),           ctrl.login);
router.post("/refresh-token",   validate(refreshTokenSchema),    ctrl.refreshToken);
router.post("/forgot-password", validate(forgotPasswordSchema),  ctrl.forgotPassword);
router.post("/reset-password",  validate(resetPasswordSchema),   ctrl.resetPassword);
router.put("/change-password",  auth, validate(changePasswordSchema), ctrl.changePassword);
router.post("/logout",          auth, validate(logoutSchema),    ctrl.logout);

module.exports = router;
