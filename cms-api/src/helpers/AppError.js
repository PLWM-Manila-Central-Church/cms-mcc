"use strict";

class AppError extends Error {
  constructor(code, status, message, details = null) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
    this.details = details;
  }

  static badRequest(code, message, details) {
    return new AppError(code, 400, message, details);
  }

  static notFound(code, message, details) {
    return new AppError(code || "NOT_FOUND", 404, message || "Resource not found", details);
  }

  static forbidden(message) {
    return new AppError("FORBIDDEN", 403, message || "Access denied");
  }

  static conflict(code, message, details) {
    return new AppError(code, 409, message, details);
  }
}

module.exports = AppError;