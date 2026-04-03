"use strict";

const Joi = require("joi");

// ── Reusable password rule (Fix #5 — password strength policy) ──
const passwordSchema = Joi.string()
  .min(8)
  .max(72) // bcrypt silently truncates beyond 72 characters
  .pattern(/[A-Z]/, "uppercase")
  .pattern(/[a-z]/, "lowercase")
  .pattern(/[0-9]/, "number")
  .required()
  .messages({
    "string.min":          "Password must be at least 8 characters",
    "string.max":          "Password must not exceed 72 characters",
    "string.pattern.name": "Password must contain at least one {#name} letter",
  });

exports.loginSchema = Joi.object({
  email:    Joi.string().email().required().messages({ "string.email": "A valid email is required" }),
  password: Joi.string().required(),
});

exports.refreshTokenSchema = Joi.object({
  refresh_token: Joi.string().required(),
});

exports.forgotPasswordSchema = Joi.object({
  email: Joi.string().email().required().messages({ "string.email": "A valid email is required" }),
});

exports.resetPasswordSchema = Joi.object({
  token:        Joi.string().required(),
  new_password: passwordSchema,
});

exports.changePasswordSchema = Joi.object({
  current_password: Joi.string().required(),
  new_password:     passwordSchema,
});

exports.logoutSchema = Joi.object({
  refresh_token: Joi.string().optional(),
});
